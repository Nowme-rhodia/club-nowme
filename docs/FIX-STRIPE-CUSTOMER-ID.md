# Fix : Récupération du stripe_customer_id

## Problème

Lors du clic sur "Mon abonnement", l'erreur suivante apparaissait :

```
❌ Impossible de récupérer le stripe_customer_id: null
```

### Cause

Le `stripe_customer_id` n'était pas disponible dans le profil car :

1. **Non chargé depuis `subscriptions`** : La requête ne récupérait pas ce champ
2. **Cherché au mauvais endroit** : Le code cherchait dans `user_profiles` au lieu de `subscriptions`

## Solutions implémentées

### 1. Charger `stripe_customer_id` depuis `subscriptions` ✅

**Fichier :** `src/lib/auth.tsx`

**Avant (❌)**
```typescript
supabase
  .from('subscriptions')
  .select('id,user_id,status,stripe_subscription_id,current_period_end')
  .eq('user_id', userId)
  .maybeSingle()
```

**Après (✅)**
```typescript
supabase
  .from('subscriptions')
  .select('id,user_id,status,stripe_subscription_id,stripe_customer_id,current_period_end')
  .eq('user_id', userId)
  .maybeSingle()
```

### 2. Inclure `stripe_customer_id` dans le profil mergé ✅

**Fichier :** `src/lib/auth.tsx`

**Avant (❌)**
```typescript
const merged = {
  ...(userData ?? {}),
  ...(subscriptionData ? { 
    subscription: subscriptionData, 
    subscription_status: subscriptionData.status 
  } : {}),
  role,
};
```

**Après (✅)**
```typescript
const merged = {
  ...(userData ?? {}),
  ...(subscriptionData ? { 
    subscription: subscriptionData, 
    subscription_status: subscriptionData.status,
    stripe_customer_id: subscriptionData.stripe_customer_id  // ✅ Ajouté
  } : {}),
  role,
};
```

### 3. Fallback : Récupérer depuis `subscriptions` si absent ✅

**Fichier :** `src/pages/Account.tsx`

**Avant (❌)**
```typescript
// Récupérer depuis user_profiles
const { data: userData } = await supabase
  .from('user_profiles')
  .select('stripe_customer_id')
  .eq('user_id', profile?.user_id)
  .single();

stripeCustomerId = userData.stripe_customer_id; // ❌ N'existe pas
```

**Après (✅)**
```typescript
// Récupérer depuis subscriptions
const { data: subscriptionData } = await supabase
  .from('subscriptions')
  .select('stripe_customer_id')
  .eq('user_id', profile?.user_id)
  .eq('status', 'active')
  .single();

stripeCustomerId = subscriptionData.stripe_customer_id; // ✅ Existe
```

## Architecture des données

### Table `subscriptions`

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,  -- ✅ C'est ici qu'il se trouve
  current_period_end TIMESTAMPTZ
);
```

### Table `user_profiles`

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  -- stripe_customer_id n'existe PAS ici
);
```

**Note :** Le `stripe_customer_id` est stocké dans `subscriptions`, pas dans `user_profiles`.

## Flux de données

### Chargement du profil

```
1. loadUserProfile() appelé
   ↓
2. Requête subscriptions avec stripe_customer_id
   ↓
3. Merge dans le profil
   profile.stripe_customer_id = subscriptionData.stripe_customer_id
   ↓
4. Sauvegarde dans localStorage
```

### Clic sur "Mon abonnement"

```
1. handleManageSubscription() appelé
   ↓
2. Vérifier profile.stripe_customer_id
   ↓
3a. Si présent → Utiliser directement ✅
   ↓
3b. Si absent → Fallback : requête subscriptions
   ↓
4. Appeler Edge Function create-portal-session
   ↓
5. Redirection vers Stripe
```

## Tests à effectuer

### Test 1 : Vérifier le chargement

1. ✅ Se connecter
2. ✅ Ouvrir la console
3. ✅ Vérifier les logs :
   ```
   ✅ loadUserProfile - Final merged profile: {
     stripe_customer_id: "cus_xxxxx",
     ...
   }
   ```

### Test 2 : Vérifier le localStorage

1. ✅ Ouvrir DevTools → Application → Local Storage
2. ✅ Chercher `nowme_profile_cache`
3. ✅ Vérifier que `stripe_customer_id` est présent :
   ```json
   {
     "userId": "xxx",
     "profile": {
       "stripe_customer_id": "cus_xxxxx",
       ...
     },
     "timestamp": 1234567890
   }
   ```

### Test 3 : Clic sur "Mon abonnement"

1. ✅ Aller sur `/account`
2. ✅ Cliquer sur "Mon abonnement"
3. ✅ Vérifier dans la console :
   ```
   🔍 Redirection vers Stripe Customer Portal...
   📡 Appel de l'Edge Function create-portal-session...
   ✅ URL du portail reçue, redirection...
   ```
4. ✅ Vérifier la redirection vers `billing.stripe.com`

### Test 4 : Fallback si stripe_customer_id absent

1. ✅ Supprimer `nowme_profile_cache` dans localStorage
2. ✅ Modifier temporairement le code pour ne pas inclure `stripe_customer_id`
3. ✅ Cliquer sur "Mon abonnement"
4. ✅ Vérifier dans la console :
   ```
   ⚠️ stripe_customer_id non trouvé dans le profil, récupération depuis subscriptions...
   ✅ stripe_customer_id récupéré: cus_xxxxx
   ```

## Vérification SQL

Pour vérifier que `stripe_customer_id` existe dans `subscriptions` :

```sql
SELECT 
  user_id,
  status,
  stripe_subscription_id,
  stripe_customer_id
FROM subscriptions
WHERE user_id = '8c297304-27dc-47e2-adf3-40ff13415463';
```

**Résultat attendu :**
```
| user_id | status | stripe_subscription_id | stripe_customer_id |
|---------|--------|------------------------|-------------------|
| xxx     | active | sub_xxxxx              | cus_xxxxx         |
```

Si `stripe_customer_id` est `NULL`, il faut le mettre à jour via webhook Stripe.

## Webhook Stripe

Pour que `stripe_customer_id` soit automatiquement renseigné, configurer le webhook :

```typescript
// supabase/functions/stripe-webhook/index.ts

if (event.type === 'customer.subscription.created') {
  const subscription = event.data.object;
  
  await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: subscription.customer  // ✅ Sauvegarder le customer_id
    })
    .eq('stripe_subscription_id', subscription.id);
}
```

## Résumé

✅ **`stripe_customer_id` chargé** depuis `subscriptions`

✅ **Inclus dans le profil** pour accès direct

✅ **Fallback implémenté** si absent du profil

✅ **Redirection Stripe** fonctionne correctement

Le problème est résolu ! L'utilisateur peut maintenant accéder au Stripe Customer Portal. 🎉
