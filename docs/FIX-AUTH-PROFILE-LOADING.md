# Fix: Problème d'authentification et chargement du profil

## Problème identifié

L'utilisateur reste en mode 'guest' après le paiement et l'inscription, causant des redirections infinies et l'impossibilité d'accéder au compte.

### Symptômes
- Le profil affiche `role: 'guest'` même après un paiement réussi
- Le prénom s'affiche brièvement puis disparaît
- Impossible d'accéder à `/account` - redirection vers `/subscription`
- Logs montrent `profile: 'null'` dans le contexte d'authentification

### Causes identifiées

1. **Timing issue** : Le `refreshProfile()` était appelé immédiatement après la vérification du paiement, mais la base de données n'était pas encore à jour
2. **Cache Supabase** : Les requêtes pouvaient retourner des données en cache
3. **Pas de retry** : Si le profil n'était pas chargé du premier coup, aucun mécanisme de retry n'existait
4. **Logs insuffisants** : Difficile de diagnostiquer où le problème se situait

## Corrections apportées

### 1. Amélioration de `loadUserProfile` (src/lib/auth.tsx)

**Changements :**
- Ajout d'un paramètre `forceRefresh` pour éviter le cache
- Ajout de logs détaillés à chaque étape
- Gestion explicite du cas où aucun profil n'existe (retourne un profil 'guest' minimal)
- Ajout d'un timestamp pour forcer le rechargement

```typescript
const loadUserProfile = async (userId: string, forceRefresh: boolean = false) => {
  const timestamp = Date.now();
  console.log('🔍 loadUserProfile - Starting for userId:', userId, 'forceRefresh:', forceRefresh);
  
  // ... requêtes avec logs détaillés
  
  if (!userData && !partnerData) {
    console.warn('⚠️ loadUserProfile - No profile data found');
    const guestProfile = { user_id: userId, role: 'guest', subscription_status: undefined };
    setProfile(guestProfile);
    return;
  }
  
  // ... merge et logs
}
```

### 2. Amélioration de `refreshProfile` (src/lib/auth.tsx)

**Changements :**
- Force le rechargement de la session Supabase
- Utilise `forceRefresh: true` pour éviter le cache
- Logs détaillés pour le debugging

```typescript
const refreshProfile = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await loadUserProfile(session.user.id, true); // Force refresh
  }
}
```

### 3. Retry mechanism dans SubscriptionSuccess (src/pages/SubscriptionSuccess.tsx)

**Changements :**
- Ajout d'un délai de 1 seconde avant le premier refresh
- Retry jusqu'à 3 fois avec des délais entre chaque tentative
- Logs pour suivre les tentatives

```typescript
if (data.success && data.status === 'active') {
  // Attendre que la DB soit à jour
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Retry jusqu'à 3 fois
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    await refreshProfile();
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`✅ Profile refresh attempt ${retries + 1}/${maxRetries} completed`);
    retries++;
    
    if (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### 4. Correction des types TypeScript

**Changements :**
- Ajout de types explicites pour les requêtes Supabase dans `signIn`

```typescript
const { data: partnerData } = await supabase
  .from('partners')
  .select('id')
  .eq('user_id', currentUser.id)
  .maybeSingle() as { data: { id: string } | null };
```

### 5. Amélioration des logs

**Changements :**
- Logs détaillés dans `loadUserProfile` pour voir les données retournées
- Logs dans `refreshProfile` pour suivre le processus
- Logs dans le contexte d'authentification avec le profil complet

## Tests à effectuer

### Test 1 : Inscription complète
1. Aller sur `/subscription`
2. Sélectionner un plan
3. Remplir le formulaire d'inscription
4. Effectuer le paiement (mode test Stripe)
5. **Vérifier** : 
   - Le prénom s'affiche dans le header
   - Cliquer sur le prénom mène à `/account`
   - Le bouton "Se déconnecter" est accessible

### Test 2 : Vérifier les logs
1. Ouvrir la console du navigateur
2. Suivre le flow d'inscription
3. **Vérifier** :
   - `🔍 loadUserProfile - User profile data:` affiche les bonnes données
   - `✅ loadUserProfile - Final merged profile:` contient `role: 'subscriber'`
   - `✅ Profile refresh attempt X/3 completed` s'affiche 3 fois
   - Pas de `role: 'guest'` après le paiement

### Test 3 : Connexion existante
1. Se déconnecter
2. Se reconnecter avec un compte existant
3. **Vérifier** :
   - Le profil se charge correctement
   - Le rôle est correct (subscriber/partner/admin)
   - Pas de redirection infinie

### Test 4 : Accès aux pages protégées
1. Après connexion, essayer d'accéder à :
   - `/account` - doit fonctionner pour les subscribers
   - `/dashboard` - doit fonctionner pour les subscribers
   - `/partner/dashboard` - doit fonctionner pour les partners
   - `/admin` - doit fonctionner pour les admins
2. **Vérifier** : Pas de redirection infinie

## Points d'attention

### Si le problème persiste

1. **Vérifier la base de données** :
   ```sql
   SELECT * FROM user_profiles WHERE email = 'email@test.com';
   SELECT * FROM subscriptions WHERE user_id = 'xxx';
   ```
   - Le profil existe-t-il ?
   - Le `subscription_status` est-il à 'active' ?

2. **Vérifier les Edge Functions** :
   - `verify-subscription` met-il bien à jour `user_profiles.subscription_status` ?
   - `link-auth-to-profile` crée-t-il bien le profil ?

3. **Vérifier les permissions Supabase** :
   - Les RLS (Row Level Security) permettent-ils la lecture du profil ?
   - L'utilisateur a-t-il les bonnes permissions ?

4. **Vérifier le cache** :
   - Vider le cache du navigateur
   - Tester en navigation privée
   - Vérifier que Supabase ne cache pas les requêtes

### Logs à surveiller

- `🔍 loadUserProfile - User profile data:` - doit contenir les données du profil
- `🔍 Auth Context - Profile:` - doit montrer le bon rôle
- `✅ Profile refresh attempt X/3 completed` - doit s'afficher 3 fois
- `⚠️ loadUserProfile - No profile data found` - ne devrait PAS apparaître après paiement

## Prochaines améliorations possibles

1. **Ajouter un indicateur visuel** pendant le chargement du profil
2. **Améliorer le retry** avec une vérification du statut du profil
3. **Ajouter un fallback** si le profil n'est toujours pas chargé après 3 tentatives
4. **Créer un endpoint dédié** pour forcer le refresh du profil depuis le serveur
5. **Implémenter un système de notification** si le profil n'est pas chargé correctement

## Fichiers modifiés

- `src/lib/auth.tsx` - Amélioration de loadUserProfile et refreshProfile
- `src/pages/SubscriptionSuccess.tsx` - Ajout du retry mechanism
- `docs/FIX-AUTH-PROFILE-LOADING.md` - Ce document

## Commit message suggéré

```
fix(auth): améliorer le chargement du profil après paiement

- Ajouter forceRefresh pour éviter le cache Supabase
- Implémenter retry mechanism (3 tentatives) après paiement
- Améliorer les logs pour faciliter le debugging
- Corriger les types TypeScript
- Gérer explicitement le cas où le profil n'existe pas

Fixes: Problème de profil 'guest' après paiement et redirections infinies
```
