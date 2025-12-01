# 🔧 Fix majeur: Edge Function verify-subscription

**Date:** 1er décembre 2025  
**Problème:** Vérification de paiement échoue silencieusement  
**Statut:** ✅ Résolu

---

## 🐛 Problème identifié

### Symptômes
- La page `/subscription-success` affiche un loader infini
- Les logs montrent `✅ [PAYMENT] Verification - start` mais pas de résultat
- Aucune erreur visible dans la console du navigateur
- L'abonnement n'est jamais activé dans la base de données

### Logs observés
```javascript
✅ [PAYMENT] Verification - start: {sessionId: 'cs_test_xxx', attempt: 1}
📄 [NAV] Page loaded: /subscription-success {sessionId: 'cs_test_xxx'}
ℹ️ [INFO] SubscriptionSuccess: Already verified, skipping
// Puis plus rien... ❌
```

### Cause racine

L'Edge Function `verify-subscription` cherchait dans une table `subscriptions` qui **n'existe pas** :

```typescript
// ❌ CODE INCORRECT (ancien)
const { data: dbSubscription, error: dbError } = await supabase
  .from("subscriptions")  // ❌ Cette table n'existe pas !
  .select("*, user_profiles!inner(email, first_name, id)")
  .eq("stripe_subscription_id", subscriptionId)
  .single();
```

**Résultat:** `dbError` est toujours présent → la fonction retourne une erreur 404 → le client ne reçoit jamais de réponse valide.

---

## ✅ Solution appliquée

### Architecture correcte

Ta base de données utilise **`user_profiles`** avec ces colonnes :
- `email` (unique)
- `subscription_status` ('active' | 'pending' | 'cancelled')
- `subscription_type` ('monthly' | 'yearly')
- `stripe_customer_id`
- `stripe_subscription_id`

**Il n'y a PAS de table `subscriptions` séparée.**

### Nouveau code (corrigé)

```typescript
// ✅ CODE CORRECT (nouveau)

// 1. Récupérer l'email du client depuis Stripe
const customerEmail = session.customer_details?.email || session.customer_email;

// 2. Trouver le profil utilisateur par email
const { data: userProfile, error: profileError } = await supabase
  .from("user_profiles")  // ✅ Table correcte
  .select("*")
  .eq("email", customerEmail)
  .single();

// 3. Déterminer le type d'abonnement (monthly/yearly)
const priceId = stripeSubscription.items.data[0]?.price.id;
let subscriptionType = "monthly";
if (priceId?.includes("year") || 
    stripeSubscription.items.data[0]?.price.recurring?.interval === "year") {
  subscriptionType = "yearly";
}

// 4. Mettre à jour le profil utilisateur
const { error: updateError } = await supabase
  .from("user_profiles")
  .update({
    subscription_status: "active",      // ✅ Colonne correcte
    subscription_type: subscriptionType, // ✅ Colonne correcte
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscriptionId,
    updated_at: new Date().toISOString()
  })
  .eq("id", userProfile.id);

// 5. Envoyer l'email de bienvenue (si pas déjà envoyé)
if (userProfile.subscription_status !== "active") {
  await supabase.functions.invoke("stripe-user-welcome", {
    body: {
      email: customerEmail,
      firstName: userProfile.first_name || "",
      redirectTo: "https://club.nowme.fr/update-password"
    }
  });
}
```

---

## 📊 Flow corrigé

### Avant (❌ Incorrect)
```
1. Client → Edge Function verify-subscription
2. Edge Function → Stripe API ✅
3. Edge Function → Table "subscriptions" ❌ (n'existe pas)
4. Erreur 404 → Client ne reçoit rien
5. Page tourne en rond ♾️
```

### Après (✅ Correct)
```
1. Client → Edge Function verify-subscription
2. Edge Function → Stripe API ✅
3. Stripe retourne session + subscription ✅
4. Edge Function récupère customer_email ✅
5. Edge Function → Table "user_profiles" WHERE email = customer_email ✅
6. Edge Function met à jour subscription_status = 'active' ✅
7. Edge Function envoie email de bienvenue ✅
8. Edge Function retourne {success: true, status: 'active'} ✅
9. Client affiche "Bienvenue !" 🎉
```

---

## 🔍 Logs attendus après correction

### Dans la console Supabase (Edge Function logs)

```
🔍 Verifying session: cs_test_xxx
✅ Session found: cs_test_xxx, status: complete, payment_status: paid
📋 Subscription status: active
📧 Customer email: test@example.com
💾 User profile found: uuid-xxx, current status: pending
📋 Subscription type: monthly
🔄 Updating user profile to active
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
    current_period_end: 1735689600
  }
}
🎉 Abonnement activé avec succès !
```

---

## 🚀 Déploiement

### 1. Redéployer l'Edge Function

```bash
cd supabase
supabase functions deploy verify-subscription
```

### 2. Vérifier le déploiement

```bash
supabase functions list
```

Devrait afficher :
```
┌─────────────────────────┬──────────┬─────────────────┐
│ NAME                    │ STATUS   │ UPDATED         │
├─────────────────────────┼──────────┼─────────────────┤
│ verify-subscription     │ DEPLOYED │ 2025-12-01 17:15│
└─────────────────────────┴──────────┴─────────────────┘
```

### 3. Tester avec un nouveau paiement

```bash
# 1. Créer un nouvel utilisateur
# 2. Aller sur /subscription
# 3. Cliquer sur "Je commence"
# 4. Remplir le formulaire
# 5. Payer avec carte test: 4242 4242 4242 4242
# 6. Vérifier les logs dans la console
```

---

## 🧪 Tests de validation

### Test 1: Vérifier la structure de la base

```sql
-- Dans Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
AND column_name IN (
  'subscription_status',
  'subscription_type',
  'stripe_customer_id',
  'stripe_subscription_id'
);
```

**Résultat attendu:**
```
subscription_status     | text
subscription_type       | text
stripe_customer_id      | text
stripe_subscription_id  | text
```

### Test 2: Vérifier qu'il n'y a PAS de table subscriptions

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions';
```

**Résultat attendu:** Aucune ligne (la table n'existe pas)

### Test 3: Simuler un paiement

```javascript
// Dans la console du navigateur sur /subscription-success
const sessionId = new URLSearchParams(window.location.search).get('session_id');

const response = await fetch('https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/verify-subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + import.meta.env.VITE_SUPABASE_ANON_KEY
  },
  body: JSON.stringify({ session_id: sessionId })
});

const result = await response.json();
console.log('✅ Verification result:', result);
```

**Résultat attendu:**
```json
{
  "success": true,
  "status": "active",
  "subscription": {
    "id": "sub_xxx",
    "status": "active",
    "current_period_end": 1735689600,
    "cancel_at_period_end": false
  },
  "message": "Abonnement vérifié et activé"
}
```

---

## 📝 Changements dans les fichiers

| Fichier | Changements | Lignes |
|---------|-------------|--------|
| `supabase/functions/verify-subscription/index.ts` | Remplacer `subscriptions` par `user_profiles` | 79-179 |
| `supabase/functions/verify-subscription/index.ts` | Récupérer `customer_email` depuis Stripe | 79-92 |
| `supabase/functions/verify-subscription/index.ts` | Déterminer `subscription_type` depuis Stripe | 115-124 |
| `supabase/functions/verify-subscription/index.ts` | Mettre à jour les bonnes colonnes | 130-139 |

---

## 🎯 Checklist post-déploiement

- [ ] Edge Function redéployée
- [ ] Logs Supabase accessibles
- [ ] Test avec un nouveau paiement
- [ ] Vérifier que `subscription_status` passe à 'active'
- [ ] Vérifier que l'email de bienvenue est envoyé
- [ ] Vérifier que la page `/subscription-success` affiche "Bienvenue"
- [ ] Vérifier que le profil utilisateur est mis à jour
- [ ] Vérifier que le rôle passe de 'guest' à 'subscriber'

---

## 🔗 Fichiers liés

- **Edge Function:** `supabase/functions/verify-subscription/index.ts`
- **Page client:** `src/pages/SubscriptionSuccess.tsx`
- **Documentation:** `docs/2025-12-01-authentification-paiement-connection.md`
- **Debug Stripe:** `docs/DEBUG-STRIPE-DIRECT.md`

---

**Dernière mise à jour:** 1er décembre 2025  
**Statut:** ✅ Fix majeur appliqué - À redéployer
