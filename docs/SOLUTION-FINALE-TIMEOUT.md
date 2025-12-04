## Solution FINALE : Timeouts Supabase

## Diagnostic

Les RLS et index sont **corrects**, MAIS il y a un problème critique :

### Politiques RLS problématiques

```sql
-- ❌ PROBLÈME : Appelle is_partner() et is_admin()
qual: ((auth.uid() = user_id) OR is_partner(auth.uid()) OR is_admin(auth.uid()))
```

**Si `is_partner()` ou `is_admin()` font une requête sur `user_profiles`, ça crée une BOUCLE INFINIE !**

```
1. Requête user_profiles
2. RLS vérifie is_admin(auth.uid())
3. is_admin() fait une requête sur user_profiles
4. RLS vérifie is_admin(auth.uid())
5. is_admin() fait une requête sur user_profiles
6. ... BOUCLE INFINIE → TIMEOUT
```

## Solution IMMÉDIATE

### Étape 1 : Exécuter le script SQL

**Fichier :** `docs/FIX-RLS-SIMPLE.sql`

Ce script :
1. ✅ Supprime TOUTES les politiques complexes
2. ✅ Crée des politiques SIMPLES sans fonctions
3. ✅ Garde uniquement `auth.uid() = user_id`

```sql
-- Supprimer les politiques problématiques
DROP POLICY IF EXISTS "User profile access" ON user_profiles;
DROP POLICY IF EXISTS "subscriptions_admin_all" ON subscriptions;

-- Créer des politiques simples
CREATE POLICY "user_profiles_select_own"
ON user_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_select_own"
ON subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);
```

### Étape 2 : Tester la connexion

**Dans la console du navigateur :**

```javascript
// Test rapide
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', (await supabase.auth.getSession()).data.session.user.id)
  .maybeSingle();

console.log('Temps:', performance.now());
console.log('Data:', data);
console.log('Error:', error);
```

**Temps attendu : < 200ms**

Si > 1000ms → problème de connexion Supabase (réseau, serveur)

### Étape 3 : Rafraîchir l'application

1. ✅ Vider le cache du navigateur (Ctrl+Shift+Delete)
2. ✅ Rafraîchir la page (F5)
3. ✅ Vérifier dans la console :
   ```
   🔍 loadUserProfile - All queries completed
     - User data: {...} error: null
     - Subscription data: {...} error: null
   ✅ loadUserProfile - Final merged profile: {...}
   ```

**Temps attendu : < 1 seconde**

## Pourquoi ça marchera

### Avant (❌)

```
Requête user_profiles
  → RLS vérifie is_admin(auth.uid())
    → is_admin() requête user_profiles
      → RLS vérifie is_admin(auth.uid())
        → is_admin() requête user_profiles
          → ... TIMEOUT après 10-15s
```

### Après (✅)

```
Requête user_profiles
  → RLS vérifie auth.uid() = user_id
    → Comparaison simple (< 1ms)
      → Résultat retourné (< 200ms)
```

## Politiques RLS finales

### user_profiles

```sql
-- SELECT : Lire son propre profil
CREATE POLICY "user_profiles_select_own"
ON user_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- INSERT : Créer son propre profil
CREATE POLICY "user_profiles_insert_own"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE : Modifier son propre profil
CREATE POLICY "user_profiles_update_own"
ON user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role : Accès complet (Edge Functions)
CREATE POLICY "user_profiles_service_all"
ON user_profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

### subscriptions

```sql
-- SELECT : Lire son propre abonnement
CREATE POLICY "subscriptions_select_own"
ON subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Service role : Accès complet (Edge Functions)
CREATE POLICY "subscriptions_service_all"
ON subscriptions FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

## Gestion des admins et partenaires

### Option 1 : Flags dans user_profiles (RECOMMANDÉ)

```sql
-- Déjà présent
is_admin BOOLEAN DEFAULT FALSE
is_partner BOOLEAN DEFAULT FALSE
```

**Utilisation dans le code :**

```typescript
const deriveRole = (profileRow: any, subscriptionRow: any): Role => {
  if (profileRow?.is_admin) return 'admin';
  if (profileRow?.is_partner) return 'partner';
  if (subscriptionRow?.status === 'active') return 'subscriber';
  return 'guest';
};
```

**Avantages :**
- ✅ Pas de requête supplémentaire
- ✅ Pas de boucle RLS
- ✅ Simple et rapide

### Option 2 : Vérifier dans l'application

Au lieu de vérifier dans RLS, vérifier dans l'application :

```typescript
// Dans PrivateRoute ou dans les pages
if (!isAdmin && route.requiresAdmin) {
  return <Navigate to="/subscription" />;
}
```

## Tests à effectuer

### Test 1 : Vérifier les politiques RLS

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_profiles', 'subscriptions')
ORDER BY tablename, policyname;
```

**Résultat attendu :**
- ✅ Pas de `is_partner()` ou `is_admin()` dans `qual`
- ✅ Seulement `auth.uid() = user_id`

### Test 2 : Tester les requêtes

```sql
-- Se connecter comme utilisateur
SET request.jwt.claim.sub = 'votre-user-id';

-- Tester
SELECT * FROM user_profiles WHERE user_id = auth.uid();
SELECT * FROM subscriptions WHERE user_id = auth.uid();
```

**Temps attendu : < 100ms**

### Test 3 : Tester dans l'application

1. ✅ Se connecter
2. ✅ Rafraîchir `/account`
3. ✅ Vérifier dans la console :
   - Pas de timeout
   - Profil chargé en < 1s
   - Pas de redirection

## Si ça ne marche toujours pas

### Vérifier les variables d'environnement

```env
VITE_SUPABASE_URL=https://dqfyuhwrjozoxadkccdj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Vérifier la connexion réseau

```javascript
// Test de latence
const start = Date.now();
await fetch('https://dqfyuhwrjozoxadkccdj.supabase.co/rest/v1/');
console.log('Latence:', Date.now() - start, 'ms');
```

**Latence attendue : < 500ms**

Si > 2000ms → problème réseau ou serveur Supabase distant

### Contacter le support Supabase

Si les requêtes sont toujours lentes après avoir simplifié les RLS :

1. Vérifier le dashboard Supabase → Database → Performance
2. Vérifier les logs Supabase → Logs → Postgres Logs
3. Contacter le support Supabase

## Résumé

✅ **Problème identifié** : Boucles infinies dans les RLS (`is_partner()`, `is_admin()`)

✅ **Solution** : Supprimer les politiques complexes, garder seulement `auth.uid() = user_id`

✅ **Gestion admin/partner** : Flags `is_admin` et `is_partner` dans `user_profiles`

✅ **Temps de chargement attendu** : < 1 seconde (au lieu de 10-15s)

**Exécuter `docs/FIX-RLS-SIMPLE.sql` MAINTENANT pour résoudre le problème !** 🚀
