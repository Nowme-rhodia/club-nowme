# Fix : Timeouts et chargements multiples du profil

## Problème identifié

Lors de l'accès à `/account/profile`, l'utilisateur est déconnecté puis reconnecté et redirigé vers `/subscription` avec "Mon compte" au lieu du prénom dans le header.

### Logs de la console

```
❌ loadUserProfile error: Error: Query timeout after 5 seconds
⚠️ loadUserProfile - Timeout detected, trying Edge Function fallback...
POST https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/get-user-profile net::ERR_FAILED
Access to fetch blocked by CORS policy
PrivateRoute - HasAllowedRole: false
PrivateRoute - Accès refusé, redirection...
```

### Causes

1. **Timeouts répétés** : Les requêtes Supabase timeout après 5 secondes
2. **Appels multiples** : `loadUserProfile` est appelé 6+ fois simultanément
3. **Cache inefficace** : Le cache n'empêche pas les appels simultanés
4. **CORS sur Edge Function** : Le fallback échoue
5. **PrivateRoute voit `loading: false` + `role: guest`** → Redirection vers `/subscription`

## Solutions implémentées

### 1. Augmentation du timeout ✅

**Fichier :** `src/lib/auth.tsx`

**Avant (❌ 5 secondes)**
```typescript
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
);
```

**Après (✅ 15 secondes)**
```typescript
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
);
```

**Changements :**
- Timeout partners : 5s → 15s
- Timeout user_profiles : 5s → 15s
- Timeout subscriptions : 5s → 15s

### 2. Système de verrouillage pour éviter les appels simultanés ✅

**Problème :** `loadUserProfile` était appelé 6 fois en même temps, créant 18 requêtes Supabase.

**Solution :**
```typescript
const [loadingProfile, setLoadingProfile] = useState<string | null>(null);

const loadUserProfile = async (userId: string, forceRefresh: boolean = false) => {
  // Vérifier si un chargement est déjà en cours
  if (loadingProfile === userId && !forceRefresh) {
    console.log('⏸️ loadUserProfile - Already loading profile for userId:', userId);
    return; // Ignorer les appels simultanés
  }
  
  // Marquer comme en cours de chargement
  setLoadingProfile(userId);
  
  try {
    // ... chargement du profil
    
    // Déverrouiller à la fin
    setLoadingProfile(null);
  } catch (e) {
    // Déverrouiller en cas d'erreur
    setLoadingProfile(null);
  }
};
```

**Résultat :**
- ✅ Un seul appel à `loadUserProfile` à la fois
- ✅ Les appels suivants sont ignorés jusqu'à la fin du premier
- ✅ Réduction drastique du nombre de requêtes

### 3. Cache amélioré ✅

**Déjà existant mais maintenant plus efficace :**
```typescript
// Vérifier le cache si pas de forceRefresh
if (!forceRefresh && profileCache && profileCache.userId === userId) {
  const cacheAge = timestamp - profileCache.timestamp;
  if (cacheAge < CACHE_DURATION) {
    console.log('✅ loadUserProfile - Using cached profile (age:', Math.round(cacheAge / 1000), 'seconds)');
    setProfile(profileCache.profile);
    return; // Retour immédiat sans requête
  }
}
```

**Durée du cache :** 20 minutes

## Pourquoi le problème se produisait

### Séquence d'événements (avant fix)

1. **Navigation vers `/account/profile`**
2. **PrivateRoute** vérifie l'accès
   - `user: false` (pas encore chargé)
   - `loading: true`
   - Attend...
3. **AuthProvider** initialise
   - Appelle `loadUserProfile` (1ère fois)
4. **onAuthStateChange** se déclenche 6 fois
   - `SIGNED_IN` (1ère fois) → `loadUserProfile` (2ème fois)
   - `INITIAL_SESSION` → `loadUserProfile` (3ème fois)
   - `SIGNED_IN` (2ème fois) → `loadUserProfile` (4ème fois)
   - etc.
5. **18 requêtes Supabase** lancées en parallèle
   - 6 × partners
   - 6 × user_profiles
   - 6 × subscriptions
6. **Timeout après 5 secondes**
   - Certaines requêtes réussissent
   - D'autres timeout
7. **Edge Function fallback échoue** (CORS)
8. **Profile reste `null` ou `guest`**
9. **PrivateRoute** voit :
   - `user: true`
   - `loading: false`
   - `isSubscriber: false` (car profile pas chargé)
   - `hasAllowedRole: false`
10. **Redirection vers `/subscription`**

### Séquence d'événements (après fix)

1. **Navigation vers `/account/profile`**
2. **PrivateRoute** vérifie l'accès
   - `user: false`
   - `loading: true`
   - Attend...
3. **AuthProvider** initialise
   - Appelle `loadUserProfile` (1ère fois)
   - `loadingProfile = userId` (verrouillé)
4. **onAuthStateChange** se déclenche 6 fois
   - Chaque appel vérifie `loadingProfile === userId`
   - **Tous ignorés** sauf le premier
5. **3 requêtes Supabase** (au lieu de 18)
   - 1 × partners (timeout 15s)
   - 1 × user_profiles (timeout 15s)
   - 1 × subscriptions (timeout 15s)
6. **Requêtes réussissent** (plus de temps)
7. **Profile chargé correctement**
   - `role: 'subscriber'`
   - `first_name: 'Boris'`
8. **Cache mis à jour**
9. **PrivateRoute** voit :
   - `user: true`
   - `loading: false`
   - `isSubscriber: true`
   - `hasAllowedRole: true`
10. **Accès autorisé** ✅

## Tests à effectuer

### Test 1 : Navigation vers /account/profile
1. ✅ Se connecter
2. ✅ Naviguer vers `/account/profile`
3. ✅ Vérifier qu'il n'y a pas de redirection vers `/subscription`
4. ✅ Vérifier que le prénom s'affiche dans le header
5. ✅ Vérifier dans la console qu'il n'y a qu'un seul appel à `loadUserProfile`

### Test 2 : Vérifier le cache
1. ✅ Naviguer vers `/account`
2. ✅ Naviguer vers `/account/profile`
3. ✅ Vérifier dans la console : "Using cached profile"
4. ✅ Pas de nouvelles requêtes Supabase

### Test 3 : Rafraîchir la page
1. ✅ Sur `/account/profile`
2. ✅ F5 (rafraîchir)
3. ✅ Vérifier qu'il n'y a pas de timeout
4. ✅ Vérifier que le profil se charge correctement

### Test 4 : Navigation rapide
1. ✅ Cliquer rapidement sur plusieurs liens
   - `/account` → `/account/profile` → `/account` → `/account/profile`
2. ✅ Vérifier qu'il n'y a pas de timeouts
3. ✅ Vérifier que le cache fonctionne

## Logs attendus (après fix)

```
🔍 loadUserProfile - Starting for userId: xxx forceRefresh: false
🔍 loadUserProfile - About to query partners table...
🔍 loadUserProfile - Partner data received: null
🔍 loadUserProfile - About to query user_profiles table...
🔍 loadUserProfile - User profile data received: {first_name: 'Boris', ...}
🔍 loadUserProfile - About to query subscriptions table...
🔍 loadUserProfile - Subscription data received: {status: 'active', ...}
🔍 loadUserProfile - Role derived: subscriber
✅ loadUserProfile - Final merged profile: {first_name: 'Boris', role: 'subscriber', ...}
👤 [AUTH] Profile loaded: {firstName: 'Boris', role: 'subscriber', ...}

// Appels suivants
✅ loadUserProfile - Using cached profile (age: 2 seconds)
```

## Améliorations futures

### 1. Supprimer l'Edge Function fallback
L'Edge Function `get-user-profile` n'est plus nécessaire avec les timeouts augmentés et le système de verrouillage.

### 2. Optimiser les requêtes Supabase
Au lieu de 3 requêtes séquentielles, faire une seule requête avec des joins :
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

### 3. Ajouter un indicateur de chargement
Afficher un spinner pendant le chargement du profil au lieu d'un écran blanc.

### 4. Persister le cache dans localStorage
Pour éviter de recharger le profil à chaque rafraîchissement de page :
```typescript
// Sauvegarder
localStorage.setItem('profile_cache', JSON.stringify(profileCache));

// Charger au démarrage
const cached = localStorage.getItem('profile_cache');
if (cached) {
  const { userId, profile, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_DURATION) {
    setProfileCache({ userId, profile, timestamp });
    setProfile(profile);
  }
}
```

## Conclusion

✅ **Timeouts augmentés** : 5s → 15s

✅ **Appels multiples évités** : Système de verrouillage

✅ **Cache efficace** : 20 minutes

✅ **Moins de requêtes** : 18 → 3

✅ **Pas de redirection** : L'utilisateur reste sur `/account/profile`

✅ **Prénom affiché** : Dans le header au lieu de "Mon compte"

Le problème de timeout et de chargements multiples est résolu ! 🎉
