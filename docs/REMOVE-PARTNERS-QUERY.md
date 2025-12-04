# Suppression de la requête Partners inutile

## Problème

La requête `partners` était exécutée **pour tous les utilisateurs** à chaque chargement de profil, alors qu'elle n'est utile que pour les partenaires (< 1% des utilisateurs).

### Impact

- **Ralentissement** : 1 requête supplémentaire inutile
- **Timeout** : La requête partners timeout souvent (15s)
- **Complexité** : Code plus complexe pour rien

### Logs avant

```
🔍 loadUserProfile - Launching all queries in parallel...
  - Partner data: null error: Error: Partners query timeout
  - User data: {...} error: null
  - Subscription data: {...} error: null
```

**Résultat :** 3 requêtes dont 1 inutile qui timeout.

## Solution

Supprimer complètement la requête `partners` du chargement initial du profil.

**Fichier :** `src/lib/auth.tsx`

### Avant (❌ 3 requêtes)

```typescript
const [
  { data: partnerData, error: partnerError },
  { data: userData, error: userError },
  { data: subscriptionData, error: subscriptionError }
] = await Promise.all([
  // Partners (INUTILE pour 99% des utilisateurs)
  supabase.from('partners').select('*').eq('user_id', userId).maybeSingle(),
  
  // User profiles
  supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
  
  // Subscriptions
  supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
]);

const role = deriveRole(userData, partnerData, subscriptionData);
const merged = {
  ...(userData ?? {}),
  ...(partnerData ? { partner: partnerData } : {}),
  ...(subscriptionData ? { subscription: subscriptionData } : {}),
  role
};
```

### Après (✅ 2 requêtes)

```typescript
const [
  { data: userData, error: userError },
  { data: subscriptionData, error: subscriptionError }
] = await Promise.all([
  // User profiles
  supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
  
  // Subscriptions
  supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
]);

const role = deriveRole(userData, null, subscriptionData);
const merged = {
  ...(userData ?? {}),
  ...(subscriptionData ? { subscription: subscriptionData } : {}),
  role
};
```

### Bonus : Timeout réduit

```typescript
// Avant
const timeoutDuration = 15000; // 15 secondes

// Après
const timeoutDuration = 10000; // 10 secondes (réduit car moins de requêtes)
```

## Gestion des partenaires

Les partenaires auront leur profil chargé **uniquement quand nécessaire** (sur leur dashboard).

### Option 1 : Charger à la demande

```typescript
// Dans PartnerDashboard.tsx
useEffect(() => {
  const loadPartnerData = async () => {
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setPartnerData(data);
  };
  
  loadPartnerData();
}, [user.id]);
```

### Option 2 : Vérifier dans deriveRole

```typescript
const deriveRole = (profileRow: any, partnerRow: any, subscriptionRow: any): Role => {
  // Admin
  if (profileRow?.is_admin) {
    return 'admin';
  }
  
  // Partner (vérifié uniquement si partnerRow fourni)
  if (partnerRow?.id) {
    return 'partner';
  }
  
  // Subscriber
  if (subscriptionRow?.status === 'active' || subscriptionRow?.status === 'trialing') {
    return 'subscriber';
  }
  
  return 'guest';
};
```

**Note :** On passe `null` pour `partnerRow` dans le chargement initial, donc `deriveRole` ne vérifiera jamais le statut partner.

### Option 3 : Flag dans user_profiles

Ajouter un champ `is_partner` dans `user_profiles` :

```sql
ALTER TABLE user_profiles ADD COLUMN is_partner BOOLEAN DEFAULT FALSE;

-- Mettre à jour pour les partenaires existants
UPDATE user_profiles
SET is_partner = TRUE
WHERE user_id IN (SELECT user_id FROM partners WHERE status = 'approved');
```

Puis dans `deriveRole` :

```typescript
const deriveRole = (profileRow: any, partnerRow: any, subscriptionRow: any): Role => {
  if (profileRow?.is_admin) return 'admin';
  if (profileRow?.is_partner) return 'partner'; // ✅ Pas besoin de requête partners
  if (subscriptionRow?.status === 'active') return 'subscriber';
  return 'guest';
};
```

## Avantages

### 1. Performance

**Avant :**
- 3 requêtes en parallèle
- Temps total = temps de la plus lente (souvent partners qui timeout)
- 15 secondes de timeout

**Après :**
- 2 requêtes en parallèle
- Temps total = temps de la plus lente (user_profiles ou subscriptions)
- 10 secondes de timeout
- **Gain : jusqu'à 5 secondes**

### 2. Simplicité

**Avant :**
```typescript
const [partnerData, userData, subscriptionData] = await Promise.all([...]);
const merged = {
  ...(userData ?? {}),
  ...(partnerData ? { partner: partnerData } : {}),
  ...(subscriptionData ? { subscription: subscriptionData } : {}),
  role
};
```

**Après :**
```typescript
const [userData, subscriptionData] = await Promise.all([...]);
const merged = {
  ...(userData ?? {}),
  ...(subscriptionData ? { subscription: subscriptionData } : {}),
  role
};
```

**Moins de code, plus clair.**

### 3. Moins d'erreurs

**Avant :**
```
⚠️ Partners query warning: Error: Partners query timeout
⚠️ User profile query warning: Error: User profile query timeout
⚠️ Subscription query warning: Error: Subscription query timeout
```

**Après :**
```
⚠️ User profile query warning: Error: User profile query timeout
⚠️ Subscription query warning: Error: Subscription query timeout
```

**1 erreur en moins.**

## Tests à effectuer

### Test 1 : Utilisateur normal (subscriber)
1. ✅ Se connecter avec un compte abonné (non-partenaire)
2. ✅ Rafraîchir `/account`
3. ✅ Vérifier dans la console : pas de requête `partners`
4. ✅ Vérifier que le profil se charge correctement
5. ✅ Vérifier que `role: 'subscriber'`

### Test 2 : Utilisateur admin
1. ✅ Se connecter avec un compte admin
2. ✅ Rafraîchir `/admin`
3. ✅ Vérifier que `role: 'admin'`
4. ✅ Vérifier que tout fonctionne

### Test 3 : Temps de chargement
1. ✅ Ouvrir DevTools → Network
2. ✅ Rafraîchir `/account`
3. ✅ Vérifier que seules 2 requêtes sont faites :
   - `user_profiles?user_id=eq.xxx`
   - `subscriptions?user_id=eq.xxx`
4. ✅ Vérifier le temps total (doit être < 1s si Supabase fonctionne)

### Test 4 : Partenaire (si applicable)
1. ✅ Se connecter avec un compte partenaire
2. ✅ Naviguer vers `/partner/dashboard`
3. ✅ Vérifier que les données partenaire se chargent
4. ✅ Vérifier que `role: 'partner'` (si Option 3 implémentée)

## Recommandation : Option 3 (is_partner flag)

Pour une solution complète et performante :

1. **Ajouter `is_partner` dans `user_profiles`**
   ```sql
   ALTER TABLE user_profiles ADD COLUMN is_partner BOOLEAN DEFAULT FALSE;
   ```

2. **Mettre à jour automatiquement avec un trigger**
   ```sql
   CREATE OR REPLACE FUNCTION update_is_partner()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.status = 'approved' THEN
       UPDATE user_profiles
       SET is_partner = TRUE
       WHERE user_id = NEW.user_id;
     ELSIF NEW.status = 'rejected' OR NEW.status = 'pending' THEN
       UPDATE user_profiles
       SET is_partner = FALSE
       WHERE user_id = NEW.user_id;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER partner_status_changed
   AFTER INSERT OR UPDATE ON partners
   FOR EACH ROW
   EXECUTE FUNCTION update_is_partner();
   ```

3. **Utiliser dans `deriveRole`**
   ```typescript
   if (profileRow?.is_partner) return 'partner';
   ```

**Avantages :**
- ✅ Pas de requête supplémentaire
- ✅ Toujours à jour (trigger)
- ✅ Simple et performant

## Conclusion

✅ **1 requête supprimée** : `partners` (inutile pour 99% des utilisateurs)

✅ **Timeout réduit** : 15s → 10s

✅ **Code simplifié** : Moins de variables, moins de complexité

✅ **Performance améliorée** : Gain jusqu'à 5 secondes

La requête `partners` sera chargée uniquement quand nécessaire (dashboard partenaire) ou remplacée par un flag `is_partner` dans `user_profiles`.
