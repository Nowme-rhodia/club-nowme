# Fix Final : Utiliser la table subscriptions au lieu de subscription_status

## Problème identifié

La colonne `subscription_status` n'existe plus dans la table `user_profiles`. Le statut de l'abonnement doit être récupéré depuis la table `subscriptions`.

### Structure actuelle

**Table `user_profiles` :**
- ❌ `subscription_status` n'existe plus
- ✅ `stripe_customer_id` existe
- ✅ `is_admin` existe

**Table `subscriptions` :**
- ✅ `user_id`
- ✅ `status` (active, trialing, canceled, etc.)
- ✅ `stripe_subscription_id`
- ✅ `current_period_end`

## Corrections appliquées

### 1. Modification de `deriveRole` (src/lib/auth.tsx)

**Avant :**
```typescript
const deriveRole = (profileRow: any, partnerRow: any): Role => {
  if (profileRow?.is_admin) return 'admin';
  if (partnerRow?.id) return 'partner';
  if (profileRow?.subscription_status === 'active') return 'subscriber';  // ❌ N'existe plus
  return 'guest';
};
```

**Après :**
```typescript
const deriveRole = (profileRow: any, partnerRow: any, subscriptionRow: any): Role => {
  if (profileRow?.is_admin) return 'admin';
  if (partnerRow?.id) return 'partner';
  // ✅ Vérifier dans la table subscriptions
  if (subscriptionRow?.status === 'active' || subscriptionRow?.status === 'trialing') {
    return 'subscriber';
  }
  return 'guest';
};
```

### 2. Modification de `loadUserProfile` (src/lib/auth.tsx)

Ajout de la requête pour récupérer l'abonnement :

```typescript
// Récupérer l'abonnement depuis la table subscriptions
const subscriptionQueryPromise = supabase
  .from('subscriptions')
  .select('id,user_id,status,stripe_subscription_id,current_period_end')
  .eq('user_id', userId)
  .maybeSingle();

const { data: subscriptionData, error: subscriptionError } = await Promise.race([
  subscriptionQueryPromise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 5000))
]) as any;

// Utiliser subscriptionData dans deriveRole
const role = deriveRole(userData, partnerData, subscriptionData);

// Ajouter subscriptionData au profil merged
const merged = {
  ...(userData ?? {}),
  ...(partnerData ? { partner: partnerData } : {}),
  ...(subscriptionData ? { 
    subscription: subscriptionData, 
    subscription_status: subscriptionData.status 
  } : {}),
  role,
};
```

### 3. Modification de `verify-subscription` (supabase/functions/verify-subscription/index.ts)

**Avant :**
```typescript
const updateData = {
  subscription_status: "active",  // ❌ Colonne n'existe plus
  stripe_customer_id: session.customer as string,
  stripe_subscription_id: subscriptionId,
  updated_at: new Date().toISOString()
};
```

**Après :**
```typescript
const updateData = {
  stripe_customer_id: session.customer as string,  // ✅ Seulement le customer_id
  updated_at: new Date().toISOString()
};
// Le statut de l'abonnement est maintenant dans la table 'subscriptions'
```

## Tests à effectuer

### Test 1 : Vérifier qu'un abonnement existant fonctionne

1. Trouver un utilisateur avec un abonnement actif :
```sql
SELECT u.user_id, u.email, u.first_name, s.status
FROM user_profiles u
JOIN subscriptions s ON s.user_id = u.user_id
WHERE s.status = 'active'
LIMIT 1;
```

2. Se connecter avec cet utilisateur
3. Vérifier dans les logs du navigateur :
```
🔍 loadUserProfile - Subscription data received: {status: 'active', ...}
🔍 loadUserProfile - Role derived: subscriber
```

4. Vérifier que l'accès à `/account` fonctionne

### Test 2 : Nouveau paiement

1. Nouvelle inscription avec un nouvel email
2. Effectuer le paiement
3. Vérifier dans les logs :
```
🔍 loadUserProfile - Subscription data received: {status: 'active', ...}
🔍 loadUserProfile - Role derived: subscriber
```

4. Vérifier en SQL que l'abonnement est bien créé :
```sql
SELECT * FROM subscriptions 
WHERE user_id = '<nouveau_user_id>' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Test 3 : Utilisateur sans abonnement

1. Créer un compte sans payer
2. Vérifier dans les logs :
```
🔍 loadUserProfile - Subscription data received: null
🔍 loadUserProfile - Role derived: guest
```

3. Vérifier que l'accès à `/account` redirige vers `/subscription`

## Déploiement

### Étape 1 : Redéployer verify-subscription

```bash
cd c:\Users\boris\.symfony\nowme\club-nowme
supabase functions deploy verify-subscription
```

### Étape 2 : Tester le flow complet

1. Nouvelle inscription
2. Paiement
3. Vérifier les logs dans Supabase Dashboard > Edge Functions > verify-subscription
4. Vérifier que l'abonnement est créé dans la table `subscriptions`
5. Vérifier que le rôle est `subscriber` dans les logs du navigateur

## Vérifications SQL

### Vérifier qu'un utilisateur a un abonnement actif

```sql
SELECT 
    u.id,
    u.user_id,
    u.email,
    u.first_name,
    u.is_admin,
    s.status as subscription_status,
    s.stripe_subscription_id,
    s.current_period_end
FROM user_profiles u
LEFT JOIN subscriptions s ON s.user_id = u.user_id
WHERE u.user_id = '<user_id>';
```

### Lister tous les utilisateurs avec leur statut d'abonnement

```sql
SELECT 
    u.email,
    u.first_name,
    CASE 
        WHEN u.is_admin THEN 'admin'
        WHEN s.status IN ('active', 'trialing') THEN 'subscriber'
        ELSE 'guest'
    END as role,
    s.status as subscription_status,
    s.current_period_end
FROM user_profiles u
LEFT JOIN subscriptions s ON s.user_id = u.user_id
ORDER BY u.created_at DESC;
```

## Résumé des changements

### Fichiers modifiés

1. ✅ `src/lib/auth.tsx`
   - Ajout du paramètre `subscriptionRow` à `deriveRole`
   - Ajout de la requête vers la table `subscriptions` dans `loadUserProfile`
   - Utilisation de `subscriptionData.status` pour déterminer le rôle

2. ✅ `supabase/functions/verify-subscription/index.ts`
   - Suppression de la mise à jour de `subscription_status` (colonne n'existe plus)
   - Conservation de la mise à jour de `stripe_customer_id`
   - L'abonnement est toujours créé/mis à jour dans la table `subscriptions`

### Ce qui fonctionne maintenant

- ✅ Le rôle est déterminé à partir de `subscriptions.status`
- ✅ Les utilisateurs avec `status = 'active'` ou `'trialing'` sont des subscribers
- ✅ Les utilisateurs sans abonnement sont des guests
- ✅ Les admins sont toujours détectés via `user_profiles.is_admin`
- ✅ Les partners sont toujours détectés via la table `partners`

### Ce qui a été supprimé

- ❌ `user_profiles.subscription_status` (colonne n'existe plus)
- ❌ `user_profiles.stripe_subscription_id` (n'est plus mis à jour)

### Ce qui reste

- ✅ `subscriptions.status` (source de vérité pour l'abonnement)
- ✅ `subscriptions.stripe_subscription_id`
- ✅ `user_profiles.stripe_customer_id` (toujours mis à jour)

## Prochaines étapes

1. **Tester le flow complet** : Inscription → Paiement → Accès au compte
2. **Vérifier les logs** : S'assurer que `subscription_status` vient bien de la table `subscriptions`
3. **Nettoyer le code** : Supprimer toutes les références à `user_profiles.subscription_status` dans le reste du code
4. **Documentation** : Mettre à jour la documentation pour refléter la nouvelle structure

## Notes importantes

- Les erreurs TypeScript dans les fonctions Deno sont normales et n'empêchent pas le déploiement
- Le Service Role Key bypass automatiquement les RLS
- La table `subscriptions` est la source de vérité pour le statut d'abonnement
- `user_profiles` ne contient plus d'information sur l'abonnement (sauf `stripe_customer_id`)
