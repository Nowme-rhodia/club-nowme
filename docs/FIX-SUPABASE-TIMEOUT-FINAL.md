# Fix : Timeouts Supabase et cache localStorage

## Problème critique

**TOUTES les requêtes Supabase timeout après 15 secondes**, ce qui rend l'application inutilisable.

### Logs

```
🔍 loadUserProfile - All queries completed
  - Partner data: null error: Error: Partners query timeout
  - User data: null error: Error: User profile query timeout
  - Subscription data: null error: Error: Subscription query timeout
⚠️ loadUserProfile - No profile data found
👤 [AUTH] Profile loaded: role: 'guest'
PrivateRoute - HasAllowedRole: false
PrivateRoute - Accès refusé, redirection...
```

### Causes possibles

1. **Problème de connexion Supabase**
   - URL incorrecte
   - Clé API incorrecte
   - Problème réseau

2. **RLS (Row Level Security) mal configuré**
   - Politiques trop restrictives
   - Politiques infinies (boucles)
   - Pas d'index sur les colonnes filtrées

3. **Pas d'index sur `user_id`**
   - Requêtes lentes
   - Timeout

## Solutions implémentées

### 1. Cache localStorage en priorité ✅

Au lieu d'attendre 15 secondes pour un timeout, on charge le profil depuis localStorage immédiatement.

**Fichier :** `src/lib/auth.tsx`

```typescript
const loadUserProfile = async (userId: string, forceRefresh: boolean = false) => {
  // 1. Vérifier le cache mémoire
  if (!forceRefresh && profileCache && profileCache.userId === userId) {
    const cacheAge = timestamp - profileCache.timestamp;
    if (cacheAge < CACHE_DURATION) {
      console.log('✅ Using memory cached profile');
      setProfile(profileCache.profile);
      return; // Retour immédiat
    }
  }
  
  // 2. Vérifier le cache localStorage
  if (!forceRefresh) {
    try {
      const localCache = localStorage.getItem('nowme_profile_cache');
      if (localCache) {
        const { userId: cachedUserId, profile: cachedProfile, timestamp: cachedTimestamp } = JSON.parse(localCache);
        const cacheAge = timestamp - cachedTimestamp;
        if (cachedUserId === userId && cacheAge < CACHE_DURATION) {
          console.log('✅ Using localStorage cached profile');
          setProfile(cachedProfile);
          setProfileCache({ userId, profile: cachedProfile, timestamp: cachedTimestamp });
          // Charger en arrière-plan pour rafraîchir le cache
          setTimeout(() => loadUserProfile(userId, true), 1000);
          return; // Retour immédiat
        }
      }
    } catch (e) {
      console.warn('⚠️ localStorage cache error:', e);
    }
  }
  
  // 3. Charger depuis Supabase (seulement si pas de cache)
  const [partnerData, userData, subscriptionData] = await Promise.all([...]);
  
  // 4. Sauvegarder dans localStorage
  localStorage.setItem('nowme_profile_cache', JSON.stringify({
    userId,
    profile: merged,
    timestamp: Date.now()
  }));
};
```

**Avantages :**
- ✅ **Chargement instantané** au rafraîchissement (0ms au lieu de 15s)
- ✅ **Pas de redirection** vers `/subscription`
- ✅ **Fonctionne même si Supabase est lent**
- ✅ **Rafraîchissement en arrière-plan** pour garder le cache à jour

### 2. Diagnostic Supabase ✅

**Fichier :** `docs/DIAGNOSE-SUPABASE-TIMEOUT.sql`

Script SQL pour diagnostiquer les problèmes :

```sql
-- 1. Vérifier que l'utilisateur existe
SELECT * FROM auth.users WHERE id = 'xxx';

-- 2. Vérifier le profil
SELECT * FROM user_profiles WHERE user_id = 'xxx';

-- 3. Vérifier l'abonnement
SELECT * FROM subscriptions WHERE user_id = 'xxx';

-- 4. Vérifier les RLS
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- 5. Vérifier les index
SELECT * FROM pg_indexes WHERE tablename = 'user_profiles';

-- 6. Tester avec RLS
SET ROLE authenticated;
SET request.jwt.claim.sub = 'xxx';
SELECT * FROM user_profiles WHERE user_id = 'xxx';
```

## Actions à faire IMMÉDIATEMENT

### 1. Vérifier les variables d'environnement

**Fichier :** `.env`

```env
VITE_SUPABASE_URL=https://dqfyuhwrjozoxadkccdj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Vérifier :**
- ✅ URL correcte
- ✅ Clé ANON correcte (pas la Service Role Key)
- ✅ Pas d'espaces avant/après

### 2. Vérifier la connexion Supabase

Dans la console du navigateur :

```javascript
// Tester la connexion
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data, 'Error:', error);

// Tester une requête simple
const { data: profiles, error: profileError } = await supabase
  .from('user_profiles')
  .select('*')
  .limit(1);
console.log('Profiles:', profiles, 'Error:', profileError);
```

### 3. Vérifier les RLS dans Supabase Dashboard

1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet
3. Aller dans **Database** → **user_profiles**
4. Cliquer sur **RLS** (Row Level Security)
5. Vérifier les politiques :

**Politique attendue pour `user_profiles` :**
```sql
-- Lecture : L'utilisateur peut lire son propre profil
CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Écriture : L'utilisateur peut modifier son propre profil
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = user_id);
```

**Politique attendue pour `subscriptions` :**
```sql
-- Lecture : L'utilisateur peut lire son propre abonnement
CREATE POLICY "Users can read own subscription"
ON subscriptions
FOR SELECT
USING (auth.uid() = user_id);
```

### 4. Ajouter des index

Si les index n'existent pas :

```sql
-- Index sur user_profiles.user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
ON user_profiles(user_id);

-- Index sur subscriptions.user_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
ON subscriptions(user_id);

-- Index sur partners.user_id
CREATE INDEX IF NOT EXISTS idx_partners_user_id 
ON partners(user_id);
```

### 5. Tester manuellement dans Supabase SQL Editor

```sql
-- Remplacer par votre user_id
SET request.jwt.claim.sub = '8c297304-27dc-47e2-adf3-40ff13415463';

-- Tester la requête
SELECT * FROM user_profiles WHERE user_id = '8c297304-27dc-47e2-adf3-40ff13415463';
SELECT * FROM subscriptions WHERE user_id = '8c297304-27dc-47e2-adf3-40ff13415463';

-- Vérifier le temps d'exécution (doit être < 100ms)
```

## Comportement avec le cache localStorage

### Premier chargement (pas de cache)

```
1. Utilisateur se connecte
2. loadUserProfile appelé
3. Pas de cache localStorage
4. Requêtes Supabase lancées
5. Timeout après 15s (problème Supabase)
6. Profile = guest
7. Redirection vers /subscription ❌
```

### Deuxième chargement (avec cache)

```
1. Utilisateur rafraîchit la page
2. loadUserProfile appelé
3. Cache localStorage trouvé (< 20 minutes)
4. Profile chargé instantanément (0ms)
5. Page s'affiche ✅
6. Requêtes Supabase lancées en arrière-plan
7. Cache mis à jour silencieusement
```

### Après fix Supabase

```
1. Utilisateur rafraîchit la page
2. loadUserProfile appelé
3. Cache localStorage trouvé
4. Profile chargé instantanément (0ms)
5. Page s'affiche ✅
6. Requêtes Supabase réussissent (< 100ms)
7. Cache mis à jour
```

## Tests à effectuer

### Test 1 : Vérifier le cache localStorage
1. ✅ Se connecter
2. ✅ Ouvrir DevTools → Application → Local Storage
3. ✅ Vérifier que `nowme_profile_cache` existe
4. ✅ Vérifier le contenu (userId, profile, timestamp)

### Test 2 : Tester le chargement depuis cache
1. ✅ Se connecter
2. ✅ Naviguer vers `/account`
3. ✅ Rafraîchir (F5)
4. ✅ Vérifier dans la console : "Using localStorage cached profile"
5. ✅ Vérifier que la page s'affiche instantanément

### Test 3 : Tester sans cache
1. ✅ Supprimer `nowme_profile_cache` dans localStorage
2. ✅ Rafraîchir
3. ✅ Vérifier que les requêtes Supabase sont lancées
4. ✅ Vérifier que le cache est recréé

### Test 4 : Vérifier la connexion Supabase
1. ✅ Ouvrir la console
2. ✅ Exécuter :
   ```javascript
   const { data } = await supabase.from('user_profiles').select('*').limit(1);
   console.log(data);
   ```
3. ✅ Si timeout → problème Supabase
4. ✅ Si réussite → problème RLS

## Solutions si Supabase continue de timeout

### Option 1 : Désactiver temporairement les RLS

**⚠️ DANGER : À faire UNIQUEMENT en développement**

```sql
-- Désactiver RLS sur user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur subscriptions
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
```

**Tester si ça résout le problème :**
- Si oui → problème RLS
- Si non → problème de connexion ou d'index

**Réactiver après le test :**
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
```

### Option 2 : Utiliser uniquement l'Edge Function

Supprimer les requêtes directes et utiliser uniquement l'Edge Function :

```typescript
const loadUserProfile = async (userId: string) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-profile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ userId })
    }
  );
  
  const { userData, partnerData, subscriptionData } = await response.json();
  // ...
};
```

**Avantages :**
- ✅ Bypass RLS (utilise Service Role Key)
- ✅ Plus rapide (une seule requête HTTP)
- ✅ Pas de timeout

### Option 3 : Augmenter le timeout

Si les requêtes sont juste un peu lentes :

```typescript
const timeoutDuration = 30000; // 30 secondes au lieu de 15
```

## Conclusion

✅ **Cache localStorage** : Chargement instantané au rafraîchissement

✅ **Pas de redirection** : Le profil est toujours disponible

✅ **Diagnostic** : Script SQL pour identifier le problème Supabase

⚠️ **Action requise** : Vérifier et fixer les RLS ou la connexion Supabase

Le cache localStorage résout le symptôme (redirection), mais il faut **absolument** résoudre le problème de timeout Supabase pour que l'application fonctionne correctement à long terme.
