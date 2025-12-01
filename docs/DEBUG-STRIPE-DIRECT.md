# 🔍 Debug Stripe - Appel direct API

**Date:** 1er décembre 2025  
**Objectif:** Débugger les paiements Stripe en appelant l'API directement

---

## 🎯 Problème résolu

### Symptôme
Après le paiement, la page `/subscription-success` tourne en rond et la vérification échoue.

### Solutions appliquées

#### 1. **Fix de la boucle infinie**
Ajout d'un `useRef` pour empêcher les appels multiples (React StrictMode).

```typescript
const hasVerified = useRef(false);

useEffect(() => {
  if (hasVerified.current) {
    logger.info('SubscriptionSuccess', 'Already verified, skipping');
    return;
  }
  hasVerified.current = true;
  
  verifySubscription(sessionId);
}, []);
```

#### 2. **Nouvelle Edge Function: `get-stripe-session`**
Récupère les détails complets d'une session Stripe.

**Fichier:** `supabase/functions/get-stripe-session/index.ts`

**Déploiement:**
```bash
supabase functions deploy get-stripe-session
```

**Utilisation:**
```typescript
import { getStripeSessionDetails } from '../lib/stripe-direct';

const details = await getStripeSessionDetails(sessionId);
console.log('Payment Status:', details.session.payment_status);
console.log('Customer:', details.session.customer);
console.log('Subscription:', details.session.subscription);
```

---

## 🛠️ Utilisation dans la console

### Option 1: Fonction de debug rapide

Ouvre la console du navigateur sur `/subscription-success` et tape :

```javascript
// Importer la fonction
import { debugStripeSession } from './src/lib/stripe-direct';

// Récupérer le session_id depuis l'URL
const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session_id');

// Debug complet
await debugStripeSession(sessionId);
```

**Résultat attendu:**
```
🔍 Stripe Session Debug
  Session ID: cs_test_xxx
  ✅ Session Details: {...}
  Payment Status: paid
  Customer ID: cus_xxx
  Subscription ID: sub_xxx
  Amount Total: 12.99 €
```

### Option 2: Appel manuel dans la console

```javascript
// Récupérer le session_id
const sessionId = new URLSearchParams(window.location.search).get('session_id');

// Appeler l'Edge Function directement
const response = await fetch('https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/get-stripe-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({ session_id: sessionId })
});

const data = await response.json();
console.log('Session details:', data);
```

---

## 📊 Nouveaux logs

Avec les corrections, les logs devraient maintenant montrer :

```javascript
// 1. Arrivée sur la page
📄 [NAV] Page loaded: /subscription-success {sessionId: 'cs_test_xxx'}

// 2. Première vérification
✅ [PAYMENT] Verification - start: {sessionId: 'cs_test_xxx', attempt: 1}

// 3. Appel unique (pas de doublon)
ℹ️ [INFO] SubscriptionSuccess: Already verified, skipping

// 4. Résultat
✅ [PAYMENT] Verification - result: {success: true, status: 'active'}
```

**Plus de doublons !** 🎉

---

## 🔧 Déploiement de la nouvelle Edge Function

### 1. Déployer la fonction

```bash
cd supabase
supabase functions deploy get-stripe-session
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
│ get-stripe-session      │ DEPLOYED │ 2025-12-01      │
│ verify-subscription     │ DEPLOYED │ 2025-12-01      │
│ stripe-webhook          │ DEPLOYED │ 2025-12-01      │
└─────────────────────────┴──────────┴─────────────────┘
```

### 3. Tester la fonction

```bash
curl -X POST https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/get-stripe-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"session_id": "cs_test_xxx"}'
```

---

## 🐛 Debug d'un paiement qui échoue

### Étape 1: Récupérer le session_id

Après le paiement, tu es redirigé vers :
```
/subscription-success?session_id=cs_test_b1ogWguT9qCBCBnaFMUUswVFYIrvlbmuE9cSWUa5Wv0OqnfRDJirOoLZmf
```

### Étape 2: Ouvrir la console et taper

```javascript
// Copier le session_id
const sessionId = 'cs_test_b1ogWguT9qCBCBnaFMUUswVFYIrvlbmuE9cSWUa5Wv0OqnfRDJirOoLZmf';

// Appeler l'API
const response = await fetch('https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/get-stripe-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Ton ANON_KEY
  },
  body: JSON.stringify({ session_id: sessionId })
});

const data = await response.json();
console.table({
  'Payment Status': data.session.payment_status,
  'Customer ID': data.session.customer,
  'Subscription ID': data.session.subscription,
  'Amount': (data.session.amount_total / 100) + ' €',
  'Email': data.session.customer_email
});
```

### Étape 3: Analyser le résultat

**Si `payment_status === 'paid'`:**
- ✅ Le paiement est OK
- ❌ Le problème est dans `verify-subscription`
- 🔍 Vérifier les logs de l'Edge Function

**Si `payment_status === 'unpaid'`:**
- ❌ Le paiement a échoué
- 🔍 Vérifier la carte de test Stripe
- 🔍 Vérifier les webhooks Stripe

**Si `payment_status === 'no_payment_required'`:**
- ℹ️ Test mode sans paiement
- ✅ Normal en développement

---

## 📝 Fichiers créés/modifiés

| Fichier | Description | Statut |
|---------|-------------|--------|
| `src/lib/stripe-direct.ts` | **Nouveau** - Fonctions d'appel direct Stripe | ✅ |
| `supabase/functions/get-stripe-session/index.ts` | **Nouveau** - Edge Function pour récupérer session | ✅ |
| `src/pages/SubscriptionSuccess.tsx` | Fix boucle infinie + logs | ✅ |

---

## 🎯 Checklist de debug

Quand un paiement échoue :

- [ ] Vérifier les logs dans la console (logger.payment.verification)
- [ ] Copier le `session_id` depuis l'URL
- [ ] Appeler `get-stripe-session` dans la console
- [ ] Vérifier `payment_status` dans la réponse
- [ ] Si `paid`, vérifier les logs de `verify-subscription`
- [ ] Si `unpaid`, vérifier la carte de test Stripe
- [ ] Vérifier que le webhook Stripe est configuré
- [ ] Vérifier la table `user_profiles` dans Supabase

---

## 🔗 Liens utiles

- **Stripe Dashboard:** https://dashboard.stripe.com/test/payments
- **Supabase Functions:** https://supabase.com/dashboard/project/YOUR_PROJECT/functions
- **Logs Supabase:** https://supabase.com/dashboard/project/YOUR_PROJECT/logs

---

**Dernière mise à jour:** 1er décembre 2025  
**Statut:** ✅ Outils de debug créés et testés
