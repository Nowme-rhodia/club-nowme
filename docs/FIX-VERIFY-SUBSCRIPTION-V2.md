# 🔧 Fix verify-subscription - Version corrigée

**Date:** 1er décembre 2025  
**Problème:** Edge Function utilise la mauvaise structure de données  
**Statut:** ✅ Corrigé avec la vraie table subscriptions

---

## 📊 Structure de la base de données

### Table `subscriptions`

```sql
create table public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,  -- ⚠️ Clé étrangère vers user_profiles.user_id
  stripe_subscription_id text UNIQUE,
  product_id text,
  price_id text,
  status text,  -- 'active', 'trialing', 'canceled', etc.
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at timestamp with time zone,
  canceled_at timestamp with time zone,
  latest_invoice_id text,
  latest_payment_intent_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT subscriptions_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES user_profiles (user_id) 
    ON DELETE CASCADE
);
```

### Table `user_profiles`

```sql
create table public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,  -- ⚠️ Lien avec auth.users
  email text UNIQUE,
  first_name text,
  last_name text,
  subscription_status text,  -- 'active', 'pending', 'cancelled'
  stripe_customer_id text,
  stripe_subscription_id text,
  -- autres colonnes...
);
```

### Relation importante

```
subscriptions.user_id → user_profiles.user_id → auth.users.id
```

---

## ✅ Code corrigé

### Flow de vérification

```typescript
// 1. Récupérer la session Stripe
const session = await stripe.checkout.sessions.retrieve(session_id);

// 2. Récupérer l'abonnement Stripe
const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

// 3. Trouver le profil utilisateur par email
const { data: userProfile } = await supabase
  .from("user_profiles")
  .select("user_id, email, first_name, last_name")
  .eq("email", customerEmail)
  .single();

// 4. Vérifier si l'abonnement existe déjà
const { data: existingSubscription } = await supabase
  .from("subscriptions")
  .select("*")
  .eq("stripe_subscription_id", subscriptionId)
  .maybeSingle();

// 5. Upsert dans la table subscriptions
await supabase
  .from("subscriptions")
  .upsert({
    user_id: userProfile.user_id,  // ⚠️ Utiliser user_id, pas id
    stripe_subscription_id: subscriptionId,
    product_id: productId,
    price_id: priceId,
    status: stripeSubscription.status,
    current_period_start: new Date(stripeSubscription.current_period_start * 1000),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000),
    // ... autres champs
  }, {
    onConflict: "stripe_subscription_id"
  });

// 6. Mettre à jour user_profiles
await supabase
  .from("user_profiles")
  .update({
    subscription_status: "active",
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscriptionId
  })
  .eq("user_id", userProfile.user_id);

// 7. Envoyer l'email de bienvenue
if (!existingSubscription || existingSubscription.status !== "active") {
  await supabase.functions.invoke("stripe-user-welcome", {
    body: { email: customerEmail, firstName: userProfile.first_name }
  });
}
```

---

## 🔍 Points clés

### 1. Utiliser `user_id` et non `id`

```typescript
// ❌ INCORRECT
.eq("id", userProfile.id)

// ✅ CORRECT
.eq("user_id", userProfile.user_id)
```

### 2. Upsert avec `onConflict`

```typescript
// Utiliser l'index unique sur stripe_subscription_id
.upsert(data, { onConflict: "stripe_subscription_id" })
```

Cela permet de :
- Créer l'abonnement s'il n'existe pas
- Mettre à jour l'abonnement s'il existe déjà

### 3. Convertir les timestamps Stripe

```typescript
// Stripe retourne des timestamps Unix (secondes)
current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString()
```

### 4. Gérer les champs nullable

```typescript
cancel_at: stripeSubscription.cancel_at 
  ? new Date(stripeSubscription.cancel_at * 1000).toISOString() 
  : null
```

---

## 📊 Logs attendus

### Dans Supabase Edge Function logs

```
🔍 Verifying session: cs_test_xxx
✅ Session found: cs_test_xxx, status: complete, payment_status: paid
📋 Subscription status: active
📧 Customer email: test@example.com
💾 User profile found: uuid-xxx
📋 Price ID: price_xxx, Product ID: prod_xxx
🔄 Upserting subscription in database
✅ Subscription upserted successfully
✅ User profile updated successfully
📧 Sending welcome email to test@example.com
✅ Welcome email sent successfully
```

### Dans la console du navigateur

```javascript
✅ [PAYMENT] Verification - start: {sessionId: 'cs_test_xxx', attempt: 1}
✅ [PAYMENT] Verification - result: {
  success: true,
  status: 'active',
  subscription: {
    id: 'sub_xxx',
    status: 'active',
    current_period_end: 1735689600,
    cancel_at_period_end: false
  },
  message: 'Abonnement vérifié et activé'
}
```

---

## 🚀 Déploiement

```bash
# 1. Redéployer l'Edge Function
supabase functions deploy verify-subscription

# 2. Vérifier les logs
supabase functions logs verify-subscription --tail

# 3. Tester avec un nouveau paiement
```

---

## 🧪 Test SQL

### Vérifier qu'un abonnement a été créé

```sql
SELECT 
  s.id,
  s.user_id,
  s.stripe_subscription_id,
  s.status,
  s.current_period_end,
  u.email,
  u.first_name
FROM subscriptions s
JOIN user_profiles u ON s.user_id = u.user_id
WHERE u.email = 'test@example.com'
ORDER BY s.created_at DESC
LIMIT 1;
```

### Vérifier que user_profiles a été mis à jour

```sql
SELECT 
  user_id,
  email,
  first_name,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id
FROM user_profiles
WHERE email = 'test@example.com';
```

**Résultat attendu:**
```
subscription_status: 'active'
stripe_customer_id: 'cus_xxx'
stripe_subscription_id: 'sub_xxx'
```

---

## 📝 Résumé des changements

| Avant | Après |
|-------|-------|
| Cherchait dans `subscriptions` avec mauvaise relation | ✅ Utilise `user_id` correctement |
| Ne créait pas d'entrée dans `subscriptions` | ✅ Upsert dans `subscriptions` |
| Mettait à jour seulement `user_profiles` | ✅ Met à jour les 2 tables |
| Pas de gestion des timestamps | ✅ Convertit les timestamps Stripe |
| Pas de gestion des champs nullable | ✅ Gère `cancel_at`, `canceled_at` |

---

## 🎯 Checklist finale

- [ ] Edge Function redéployée
- [ ] Test avec un nouveau paiement
- [ ] Vérifier que `subscriptions` contient une ligne
- [ ] Vérifier que `user_profiles.subscription_status = 'active'`
- [ ] Vérifier que l'email de bienvenue est envoyé
- [ ] Vérifier les logs Supabase
- [ ] Vérifier que la page `/subscription-success` affiche "Bienvenue"

---

**Dernière mise à jour:** 1er décembre 2025  
**Statut:** ✅ Corrigé avec la vraie structure de la base
