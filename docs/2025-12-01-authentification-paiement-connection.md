# 🔐 Système d'Authentification, Paiement et Connexion - Nowme Club

**Date:** 1er décembre 2025  
**Version:** 2.0  
**Auteur:** Documentation technique

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Gestion des sessions](#gestion-des-sessions)
3. [Flow utilisateur complet](#flow-utilisateur-complet)
4. [Paramètres de gestion utilisateur](#paramètres-de-gestion-utilisateur)
5. [Flow de vérification post-paiement](#flow-de-vérification-post-paiement)
6. [Système de logging](#système-de-logging)
7. [Résolution des problèmes](#résolution-des-problèmes)

---

## 🎯 Vue d'ensemble

### Architecture du système

```
┌─────────────────┐
│   Supabase Auth │  ← Gestion des sessions et tokens
└────────┬────────┘
         │
         ├─→ localStorage (session persistante)
         ├─→ AuthProvider (React Context)
         └─→ user_profiles (table Supabase)
```

### Pages clés

| Page | Route | Rôle | Accessible |
|------|-------|------|------------|
| **Subscription** | `/subscription` | Choix du plan (monthly/yearly) | Tous |
| **SignUp** | `/auth/signup?plan={code}` | Inscription utilisateur | Non connectés |
| **Checkout** | `/checkout?plan={code}` | Finalisation avant Stripe | Connectés uniquement |
| **Success** | `/subscription-success?session_id={id}` | Confirmation post-paiement | Après paiement |
| **Account** | `/account` | Gestion du compte | Connectés uniquement |

---

## 🔐 Gestion des sessions

### A) Configuration Supabase

**Fichier:** `src/lib/supabase.ts`

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // ✅ Session sauvegardée dans localStorage
    autoRefreshToken: true,       // ✅ Refresh automatique du token
    detectSessionInUrl: true      // ✅ Détection des tokens dans l'URL
  }
});
```

### B) Stockage de la session

**Où ?** `localStorage` du navigateur  
**Clé:** `supabase.auth.token`  
**Contenu:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "v1.MXj...",
  "expires_at": 1701453600,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### C) Cycle de vie de la session

```
1. Inscription (signUp)
   ↓
2. Connexion automatique (signInWithPassword)
   ↓
3. Token stocké dans localStorage
   ↓
4. AuthProvider charge la session au démarrage
   ↓
5. Refresh automatique toutes les 55 minutes
   ↓
6. Déconnexion (signOut) → Suppression du localStorage
```

### D) Vérification de session

**Fichier:** `src/lib/auth.tsx`

```typescript
// Au démarrage de l'app
useEffect(() => {
  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    logger.auth.sessionCheck(session);
    
    if (session?.user) {
      setUser(session.user);
      await loadUserProfile(session.user.id);
    }
  };
  init();
}, []);

// Écoute des changements de session
supabase.auth.onAuthStateChange((event, session) => {
  logger.auth.stateChange(event, session);
  // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
});
```

---

## 🚀 Flow utilisateur complet

### Scénario 1: Nouvel utilisateur (non connecté)

```
/subscription
  │
  ├─ Clic sur "Je commence à 12,99€"
  │
  ↓
/auth/signup?plan=monthly
  │
  ├─ Remplir formulaire (email, password, prénom, nom)
  ├─ Étape 1: Création auth.users (supabase.auth.signUp)
  ├─ Étape 2: Création user_profiles (via Edge Function)
  ├─ Étape 3: Mise à jour prénom/nom
  ├─ Étape 4: Connexion automatique (signInWithPassword)
  │
  ↓
/checkout?plan=monthly
  │
  ├─ Vérification: user connecté ✅
  ├─ Affichage récapitulatif du plan
  ├─ Clic "Finaliser mon abonnement"
  │
  ↓
Stripe Checkout (redirection externe)
  │
  ├─ Paiement CB
  ├─ Webhook Stripe → Supabase
  │
  ↓
/subscription-success?session_id=cs_test_xxx
  │
  ├─ Vérification du paiement (Edge Function)
  ├─ Activation subscription_status = 'active'
  ├─ Envoi email de bienvenue
  │
  ↓
✅ Utilisateur connecté et abonné
```

### Scénario 2: Utilisateur déjà connecté

```
/subscription
  │
  ├─ Détection: user connecté ✅
  ├─ Clic sur "Je commence à 12,99€"
  │
  ↓
/checkout?plan=monthly (redirection directe, pas de signup)
  │
  ├─ Vérification: user connecté ✅
  ├─ Utilisation de profile.email
  │
  ↓
Stripe Checkout → Success
```

### Scénario 3: Utilisateur déjà payé

```
/subscription-success?session_id=cs_test_xxx
  │
  ├─ Vérification: session_id déjà traitée
  ├─ Statut: subscription_status = 'active'
  │
  ↓
Affichage: "Bienvenue dans la communauté !"
  │
  ├─ Bouton "Découvrir les kiffs"
  ├─ Bouton "Voir mon compte"
```

---

## 📊 Paramètres de gestion utilisateur

### A) Données utilisateur (AuthContext)

**Fichier:** `src/lib/auth.tsx`

```typescript
interface AuthContextType {
  user: User | null;              // Objet Supabase Auth
  profile: any | null;            // Profil complet (user_profiles + partners)
  loading: boolean;               // État de chargement
  signIn: Function;               // Connexion
  signOut: Function;              // Déconnexion
  isAdmin: boolean;               // Flag admin
  isPartner: boolean;             // Flag partenaire
  isSubscriber: boolean;          // Flag abonné actif
}
```

### B) Structure du profil

```typescript
profile = {
  // Depuis user_profiles
  id: "uuid",
  user_id: "uuid",
  first_name: "Marie",
  last_name: "Dupont",
  email: "marie@example.com",
  phone: "+33612345678",
  photo_url: "https://...",
  subscription_status: "active" | "pending" | "cancelled",
  subscription_type: "monthly" | "yearly",
  is_admin: false,
  stripe_customer_id: "cus_xxx",
  stripe_subscription_id: "sub_xxx",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  
  // Calculé
  role: "admin" | "partner" | "subscriber" | "guest",
  
  // Si partenaire
  partner: {
    id: "uuid",
    business_name: "...",
    status: "approved"
  }
}
```

### C) Détermination du rôle

**Fichier:** `src/lib/auth.tsx`

```typescript
const deriveRole = (profileRow, partnerRow): Role => {
  // Priorité: admin > partner > subscriber > guest
  
  if (profileRow?.is_admin) return 'admin';
  if (partnerRow?.id) return 'partner';
  if (profileRow?.subscription_status === 'active') return 'subscriber';
  return 'guest';
};
```

### D) Flags de permission

```typescript
isAdmin = role === 'admin'
isPartner = role === 'partner'
isSubscriber = role === 'subscriber' || subscription_status === 'active'
```

---

## 💳 Flow de vérification post-paiement

### Étape 1: Redirection depuis Stripe

```
Stripe Checkout (succès)
  ↓
/subscription-success?session_id=cs_test_b1AjMVRteo...
```

### Étape 2: Vérification côté client

**Fichier:** `src/pages/SubscriptionSuccess.tsx`

```typescript
useEffect(() => {
  const sessionId = searchParams.get('session_id');
  if (!sessionId) {
    // Pas de session_id → Erreur
    return;
  }
  
  // Appel Edge Function une seule fois
  verifySubscription(sessionId);
}, []); // ⚠️ Dépendances vides = une seule exécution
```

### Étape 3: Edge Function `verify-subscription`

**Fichier:** `supabase/functions/verify-subscription/index.ts`

```typescript
1. Récupération session_id
2. Appel Stripe API: stripe.checkout.sessions.retrieve(session_id)
3. Vérification payment_status === 'paid'
4. Récupération customer_id et subscription_id
5. Mise à jour user_profiles:
   - subscription_status = 'active'
   - stripe_customer_id = customer_id
   - stripe_subscription_id = subscription_id
6. Envoi email de bienvenue (via Resend)
7. Retour { success: true, status: 'active' }
```

### Étape 4: Webhook Stripe (backup)

**Endpoint:** `/functions/v1/stripe-webhook`

```typescript
Événements écoutés:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

Action: Synchronisation automatique de subscription_status
```

### Étape 5: Retry logic

```typescript
if (status === 'pending') {
  // Paiement en cours de traitement
  if (retryCount < 5) {
    setTimeout(() => verifySubscription(sessionId, retryCount + 1), 3000);
  } else {
    // Échec après 5 tentatives
    toast.error('Le paiement prend plus de temps que prévu');
  }
}
```

---

## 🔍 Système de logging

### A) Fichier centralisé

**Fichier:** `src/lib/logger.ts`

```typescript
export const logger = {
  auth: {
    sessionCheck(session),
    signUp(step, data),
    signIn(step, data),
    signOut(),
    profileLoad(profile),
    stateChange(event, session)
  },
  
  payment: {
    checkoutStart(plan, email),
    stripeRedirect(sessionId),
    verification(step, data),
    webhookReceived(event, data)
  },
  
  navigation: {
    redirect(from, to, reason),
    pageLoad(page, params),
    userAction(action, details)
  },
  
  data: {
    fetch(resource, params),
    update(resource, data),
    error(resource, error)
  },
  
  error(context, error, details),
  warn(context, message, details),
  info(context, message, details)
};
```

### B) Activation des logs

**Méthode 1:** Mode développement (automatique)
```bash
npm run dev  # Les logs sont actifs
```

**Méthode 2:** Variable d'environnement
```bash
# .env
VITE_DEBUG_LOGS=true
```

### C) Exemples de logs

```javascript
// Vérification de session
🔐 [AUTH] Session check: {
  hasSession: true,
  userId: "5f41958b-a90f-4735-bd33-fc811d501598",
  email: "test@example.com",
  timestamp: "2025-12-01T14:33:53.068Z"
}

// Chargement du profil
👤 [AUTH] Profile loaded: {
  userId: "5f41958b-a90f-4735-bd33-fc811d501598",
  firstName: "Test706",
  role: "guest",
  subscriptionStatus: "pending"
}

// Changement d'état
🔄 [AUTH] State change - SIGNED_IN: {
  hasSession: true,
  userId: "5f41958b-a90f-4735-bd33-fc811d501598"
}

// Redirection
🧭 [NAV] Redirect: /auth/signup → /checkout { reason: "User signed up" }

// Vérification paiement
✅ [PAYMENT] Verification - Success: {
  sessionId: "cs_test_xxx",
  status: "active"
}
```

---

## 🛠️ Résolution des problèmes

### Problème 1: Session non persistante

**Symptôme:** L'utilisateur est déconnecté après rafraîchissement

**Causes possibles:**
- `persistSession: false` dans supabase.ts
- localStorage bloqué (navigation privée)
- Token expiré sans refresh

**Solution:**
```typescript
// Vérifier la config
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,  // ✅ Doit être true
    autoRefreshToken: true // ✅ Doit être true
  }
});

// Vérifier le localStorage
console.log(localStorage.getItem('supabase.auth.token'));
```

### Problème 2: Redirection infinie sur /subscription

**Symptôme:** L'utilisateur connecté est redirigé en boucle

**Cause:** `useEffect` avec mauvaises dépendances

**Solution:**
```typescript
// ❌ Mauvais
useEffect(() => {
  if (user) navigate('/subscription');
}, [user, navigate]); // Trop de dépendances

// ✅ Bon
useEffect(() => {
  if (user && !isSigningUp && !loading) {
    navigate('/subscription');
  }
}, [user, isSigningUp, loading, navigate]);
```

### Problème 3: Page de confirmation bloquée

**Symptôme:** "Vérification en cours..." sans fin

**Cause:** `useEffect` avec `searchParams` en dépendance

**Solution:**
```typescript
// ❌ Mauvais
useEffect(() => {
  verifySubscription(sessionId);
}, [searchParams]); // Cause une boucle

// ✅ Bon
useEffect(() => {
  const sessionId = searchParams.get('session_id');
  if (sessionId) verifySubscription(sessionId);
}, []); // Une seule exécution
```

### Problème 4: Email dans l'URL

**Symptôme:** `/checkout?plan=monthly&email=test@example.com`

**Cause:** Email passé manuellement dans l'URL

**Solution:**
```typescript
// ❌ Mauvais
navigate(`/checkout?plan=${plan}&email=${email}`);

// ✅ Bon
navigate(`/checkout?plan=${plan}`);
// Utiliser profile.email dans Checkout.tsx
```

### Problème 5: Utilisateur déjà payé voit "Vérification..."

**Symptôme:** Utilisateur avec subscription_status='active' bloqué

**Cause:** Vérification qui ne détecte pas le statut existant

**Solution:**
```typescript
// Dans verify-subscription Edge Function
const { data: existingProfile } = await supabase
  .from('user_profiles')
  .select('subscription_status')
  .eq('stripe_customer_id', customer_id)
  .single();

if (existingProfile?.subscription_status === 'active') {
  return { success: true, status: 'active', message: 'Already active' };
}
```

---

## 📝 Checklist de déploiement

- [ ] Vérifier `persistSession: true` dans supabase.ts
- [ ] Tester le flow complet: signup → checkout → paiement → success
- [ ] Vérifier les logs dans la console (mode dev)
- [ ] Tester la déconnexion et reconnexion
- [ ] Vérifier que l'email n'apparaît pas dans l'URL
- [ ] Tester avec un utilisateur déjà connecté
- [ ] Tester avec un utilisateur déjà payé
- [ ] Vérifier l'envoi de l'email de bienvenue
- [ ] Tester le webhook Stripe en production
- [ ] Vérifier la page /account (déconnexion, profil)

---

## 🔗 Liens utiles

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [React Router Documentation](https://reactrouter.com/)

---

**Dernière mise à jour:** 1er décembre 2025  
**Prochaine révision:** Après tests en production
