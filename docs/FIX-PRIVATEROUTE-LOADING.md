# Fix : PrivateRoute et chargement du profil

## Problème

Lors du rafraîchissement de la page `/account`, l'utilisateur est redirigé vers `/subscription` pendant 15 secondes, puis son nom apparaît dans le header.

### Logs de la console

```
PrivateRoute - User: true
PrivateRoute - Loading: true
PrivateRoute - HasAllowedRole: false
PrivateRoute - Accès refusé, redirection...

❌ loadUserProfile error: Error: Query timeout after 15 seconds
⚠️ loadUserProfile - Timeout detected, trying Edge Function fallback...
Access to fetch blocked by CORS policy
```

### Causes

1. **PrivateRoute vérifie le rôle même si `loading: true`**
   - Après 8 secondes de timeout, il arrête d'attendre
   - Il vérifie `hasAllowedRole` alors que le profil n'est pas encore chargé
   - Résultat : `hasAllowedRole: false` → redirection vers `/subscription`

2. **Requêtes séquentielles au lieu de parallèles**
   - Partners → 15s timeout
   - User profiles → 15s timeout
   - Subscriptions → 15s timeout
   - Total : jusqu'à 45 secondes !

3. **Timeout sur la requête `partners`**
   - Problème de connexion Supabase ou RLS
   - Bloque tout le chargement

## Solutions implémentées

### 1. PrivateRoute attend toujours si `loading: true` ✅

**Fichier :** `src/components/PrivateRoute.tsx`

**Avant (❌)**
```typescript
// 1️⃣ Pendant le chargement initial
if (loading && !timeoutPassed) {
  return <LoadingSpinner />;
}

// 2️⃣ Si pas de session après le délai
if (!user && (timeoutPassed || !loading)) {
  return <Navigate to="/auth/signin" />;
}

// 3️⃣ Vérification des rôles
if (allowedRoles && user) {
  const hasAllowedRole = ...;
  if (!hasAllowedRole) {
    return <Navigate to="/subscription" />; // ❌ Redirige même si loading: true
  }
}
```

**Problème :** Après 8 secondes, `timeoutPassed: true`, donc il passe à l'étape 3 même si `loading: true`.

**Après (✅)**
```typescript
// 1️⃣ Pendant le chargement - TOUJOURS attendre si loading est true
if (loading) {
  return <LoadingSpinner />;
}

// 2️⃣ Si pas de session après le chargement
if (!user) {
  return <Navigate to="/auth/signin" />;
}

// 3️⃣ Vérification des rôles
if (allowedRoles && user) {
  const hasAllowedRole = ...;
  if (!hasAllowedRole) {
    return <Navigate to="/subscription" />; // ✅ N'arrive ici que si loading: false
  }
}
```

**Résultat :**
- ✅ Attend toujours que `loading: false`
- ✅ Ne vérifie le rôle qu'une fois le profil chargé
- ✅ Pas de redirection prématurée

### 2. Requêtes en parallèle au lieu de séquentielles ✅

**Fichier :** `src/lib/auth.tsx`

**Avant (❌ Séquentiel)**
```typescript
// 1. Partners (attend 15s max)
const { data: partnerData } = await Promise.race([
  supabase.from('partners').select('*').eq('user_id', userId).maybeSingle(),
  timeout(15000)
]);

// 2. User profiles (attend 15s max)
const { data: userData } = await Promise.race([
  supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
  timeout(15000)
]);

// 3. Subscriptions (attend 15s max)
const { data: subscriptionData } = await Promise.race([
  supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
  timeout(15000)
]);

// Total : jusqu'à 45 secondes !
```

**Après (✅ Parallèle)**
```typescript
const [
  { data: partnerData, error: partnerError },
  { data: userData, error: userError },
  { data: subscriptionData, error: subscriptionError }
] = await Promise.all([
  // Partners
  Promise.race([
    supabase.from('partners').select('*').eq('user_id', userId).maybeSingle(),
    timeout(15000)
  ]).catch(err => ({ data: null, error: err })),
  
  // User profiles
  Promise.race([
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    timeout(15000)
  ]).catch(err => ({ data: null, error: err })),
  
  // Subscriptions
  Promise.race([
    supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
    timeout(15000)
  ]).catch(err => ({ data: null, error: err }))
]);

// Total : 15 secondes max (au lieu de 45) !
```

**Résultat :**
- ✅ 3 requêtes lancées en même temps
- ✅ Temps total = temps de la plus lente (15s max)
- ✅ Gain de temps : jusqu'à 30 secondes
- ✅ Si une requête échoue, les autres continuent

## Pourquoi le problème se produisait

### Séquence d'événements (avant fix)

1. **Rafraîchissement de `/account`**
2. **PrivateRoute** s'initialise
   - `loading: true`
   - Affiche le spinner
3. **AuthProvider** charge le profil
   - Requête `partners` → timeout après 15s
   - Requête `user_profiles` → timeout après 15s
   - Requête `subscriptions` → réussit
4. **Après 8 secondes** : `timeoutPassed: true`
5. **PrivateRoute** vérifie le rôle
   - `user: true`
   - `loading: true` (mais ignoré car `timeoutPassed`)
   - `isSubscriber: false` (profil pas encore chargé)
   - `hasAllowedRole: false`
6. **Redirection vers `/subscription`** ❌
7. **Après 30 secondes** : profil finalement chargé
8. **Nom apparaît dans le header**

### Séquence d'événements (après fix)

1. **Rafraîchissement de `/account`**
2. **PrivateRoute** s'initialise
   - `loading: true`
   - Affiche le spinner
3. **AuthProvider** charge le profil
   - 3 requêtes lancées en parallèle
   - Temps total : 15s max (au lieu de 45s)
4. **PrivateRoute** attend
   - `loading: true` → continue d'afficher le spinner
   - Ne vérifie PAS le rôle
5. **Profil chargé** (après 15s max)
   - `loading: false`
   - `isSubscriber: true`
6. **PrivateRoute** vérifie le rôle
   - `user: true`
   - `loading: false`
   - `isSubscriber: true`
   - `hasAllowedRole: true`
7. **Accès autorisé** ✅
8. **Page `/account` s'affiche**

## Tests à effectuer

### Test 1 : Rafraîchir /account
1. ✅ Se connecter avec un compte abonné
2. ✅ Naviguer vers `/account`
3. ✅ Appuyer sur F5 (rafraîchir)
4. ✅ Vérifier qu'il n'y a PAS de redirection vers `/subscription`
5. ✅ Vérifier que le spinner s'affiche pendant le chargement
6. ✅ Vérifier que la page `/account` s'affiche après le chargement

### Test 2 : Rafraîchir /account/profile
1. ✅ Naviguer vers `/account/profile`
2. ✅ Appuyer sur F5
3. ✅ Vérifier qu'il n'y a PAS de redirection
4. ✅ Vérifier que la page s'affiche correctement

### Test 3 : Temps de chargement
1. ✅ Ouvrir la console
2. ✅ Rafraîchir `/account`
3. ✅ Vérifier dans les logs : "Launching all queries in parallel"
4. ✅ Vérifier que le temps total est < 20 secondes

### Test 4 : Utilisateur non abonné
1. ✅ Se connecter avec un compte sans abonnement
2. ✅ Essayer d'accéder à `/account`
3. ✅ Vérifier redirection vers `/subscription` (après chargement)

## Améliorations futures

### 1. Optimiser les requêtes Supabase avec JOIN
Au lieu de 3 requêtes séparées, faire une seule requête avec des joins :

```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .select(`
    *,
    partner:partners(*),
    subscription:subscriptions(*)
  `)
  .eq('user_id', userId)
  .single();
```

**Avantages :**
- 1 seule requête au lieu de 3
- Temps de chargement divisé par 3
- Moins de risque de timeout

### 2. Persister le profil dans localStorage
Pour éviter de recharger à chaque rafraîchissement :

```typescript
// Au chargement
const cached = localStorage.getItem('profile_cache');
if (cached) {
  const { profile, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_DURATION) {
    setProfile(profile);
    setLoading(false);
    return; // Pas besoin de recharger
  }
}

// Après chargement
localStorage.setItem('profile_cache', JSON.stringify({
  profile: merged,
  timestamp: Date.now()
}));
```

### 3. Afficher un message d'erreur si timeout
Au lieu d'un spinner infini :

```typescript
if (loading && timeoutPassed) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Le chargement prend plus de temps que prévu...</p>
        <button onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    </div>
  );
}
```

### 4. Investiguer le timeout sur `partners`
Le timeout de 15 secondes sur la table `partners` indique un problème :
- Vérifier les RLS (Row Level Security)
- Vérifier les index sur `user_id`
- Vérifier la connexion Supabase

## Conclusion

✅ **PrivateRoute attend toujours** si `loading: true`

✅ **Requêtes en parallèle** : 45s → 15s max

✅ **Pas de redirection prématurée** : Le rôle est vérifié uniquement après le chargement

✅ **Gestion d'erreur** : Si une requête échoue, les autres continuent

Le problème de redirection lors du rafraîchissement est résolu ! 🎉
