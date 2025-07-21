# 🔄 Parcours complet : Stripe → Utilisateur connecté

## 📋 **FLUX NORMAL D'INSCRIPTION**

### **1. 🛒 Utilisateur clique "S'abonner"**
```
/subscription → Clic "Tester à 12,99€"
```

### **2. 💳 Redirection vers Stripe Checkout**
```javascript
// Dans createCheckoutSession
const session = await stripe.checkout.sessions.create({
  customer_email: email, // Email fourni par l'utilisateur
  success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/subscription`
});
```

### **3. 🎯 Paiement réussi → Webhook Stripe**
```javascript
// supabase/functions/stripe-webhook/index.ts
case "checkout.session.completed":
  const sessionData = stripeData;
  const email = await extractEmailFromStripeData(sessionData);
  
  // Créer ou mettre à jour user_profiles
  await supabase.from("user_profiles").insert({
    email,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: "active",
    subscription_type: isDiscoveryPrice ? "discovery" : "premium"
  });
```

### **4. 📧 Email d'invitation automatique**
Le webhook devrait déclencher l'envoi d'un email avec lien de création de compte.

### **5. 🔐 Utilisateur crée son compte**
```
/auth/complete-profile → Finalise son profil
```

### **6. ✅ Connexion et accès au club**
```
/auth/signin → /club ou /account
```

---

## 🔍 **DIAGNOSTIC DU PROBLÈME ACTUEL**

### **❌ Ce qui ne marche pas :**
1. **Pas de création automatique de compte auth** après paiement Stripe
2. **Pas d'email d'invitation** envoyé
3. **Utilisateurs dans user_profiles sans compte auth correspondant**

### **✅ Ce qui marche :**
1. **Webhook Stripe** reçoit les événements
2. **user_profiles** est créé avec les bonnes données
3. **Stripe** traite les paiements correctement

---

## 🛠️ **SOLUTIONS À IMPLÉMENTER**

### **Solution 1 : Webhook complet (RECOMMANDÉE)**
Modifier le webhook pour créer le compte auth + envoyer l'email :

```javascript
case "checkout.session.completed":
  // 1. Créer le compte auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    email_confirm: true,
    user_metadata: {
      first_name: sessionData.customer_details?.name?.split(' ')[0] || '',
      last_name: sessionData.customer_details?.name?.split(' ')[1] || ''
    }
  });

  // 2. Créer le profil
  await supabase.from("user_profiles").insert({
    user_id: authUser.user.id,
    email,
    subscription_status: "active",
    subscription_type: isDiscoveryPrice ? "discovery" : "premium"
  });

  // 3. Envoyer email d'invitation
  await supabase.auth.admin.generateLink({
    type: 'invite',
    email: email,
    options: {
      redirectTo: `${siteUrl}/auth/complete-profile`
    }
  });
```

### **Solution 2 : Flux manuel actuel**
1. **Créer manuellement** le compte auth dans Supabase
2. **Lier** avec le profil existant dans user_profiles
3. **Tester** la connexion

---

## 📊 **TABLES IMPLIQUÉES**

### **auth.users** (Supabase Auth)
- `id` → Identifiant unique
- `email` → Email de connexion
- `encrypted_password` → Mot de passe hashé
- `email_confirmed_at` → Confirmation email

### **public.user_profiles** (Données métier)
- `user_id` → FK vers auth.users.id
- `email` → Email (dupliqué pour facilité)
- `subscription_status` → active/pending/cancelled
- `subscription_type` → discovery/premium
- `stripe_customer_id` → Lien avec Stripe

### **public.stripe_webhook_events** (Logs)
- `stripe_event_id` → ID événement Stripe
- `event_type` → Type d'événement
- `customer_email` → Email du client
- `status` → processing/completed/failed

---

## 🎯 **PROCHAINES ÉTAPES**

1. **Corriger le webhook** pour créer les comptes auth
2. **Tester le flux complet** Stripe → Compte → Connexion
3. **Ajouter l'envoi d'emails** d'invitation
4. **Créer une page** de finalisation de profil

Voulez-vous que je commence par corriger le webhook Stripe ?