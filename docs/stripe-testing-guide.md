# 🧪 Guide de test Stripe - Nowme Club

## 🎯 **Configuration requise**

### Variables d'environnement (.env) :
```bash
VITE_SUPABASE_URL=https://dqfyuhwrjozoxadkccdj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # ou pk_test_...
STRIPE_SECRET_KEY=sk_live_... # ou sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Optionnel pour dev
```

### Prix Stripe configurés :
- **Mensuel** : `price_1RqkgvDaQ8XsywAvq2A06dT7`
- **Annuel** : `price_1RqkrQDaQ8XsywAvahFQAwMA`

## 🔧 **Installation Stripe CLI**

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
wget -O - https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

## 🚀 **Tests étape par étape**

### **1. Test des fonctions Supabase**
```bash
npm run test:stripe test
```
Vérifie :
- ✅ Création session checkout
- ✅ Table webhook events
- ✅ Queue emails
- ✅ Fonction send-emails

### **2. Configuration webhook local**
```bash
# Se connecter à Stripe
stripe login

# Écouter les webhooks (laisser tourner)
npm run stripe:listen
```

### **3. Déclencher un événement test**
```bash
# Dans un autre terminal
npm run stripe:test
```

### **4. Vérifier le flow complet**

#### A. Vérifier l'événement webhook :
```sql
-- Dans Supabase SQL Editor
SELECT * FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 5;
```

#### B. Vérifier la création utilisateur :
```sql
SELECT user_id, email, subscription_status, subscription_type 
FROM user_profiles 
WHERE email LIKE '%test%' 
ORDER BY created_at DESC;
```

#### C. Vérifier les emails :
```sql
SELECT to_address, subject, status, created_at 
FROM emails 
ORDER BY created_at DESC 
LIMIT 5;
```

## 🎭 **Test en mode production**

### **1. Test checkout réel**
1. Aller sur `/subscription`
2. Cliquer "Je commence à 12,99€"
3. Utiliser une carte test Stripe : `4242 4242 4242 4242`
4. Compléter le checkout

### **2. Vérifier la création de compte**
1. Vérifier l'email de bienvenue reçu
2. Cliquer sur le lien de création de mot de passe
3. Se connecter avec le nouveau compte
4. Vérifier l'accès aux fonctionnalités

## 🐛 **Debugging**

### **Logs Supabase Edge Functions :**
1. Aller dans Supabase Dashboard
2. Edge Functions → stripe-webhook → Logs
3. Voir les logs en temps réel

### **Logs Stripe :**
1. Stripe Dashboard → Developers → Webhooks
2. Voir les tentatives et réponses

### **Commandes utiles :**
```bash
# Voir les événements Stripe récents
stripe events list --limit 10

# Voir les détails d'un événement
stripe events retrieve evt_...

# Tester un webhook spécifique
stripe trigger checkout.session.completed --add customer_email=test@example.com
```

## 🔍 **Checklist de validation**

- [ ] Session checkout créée avec bon prix
- [ ] Webhook reçu et traité sans erreur
- [ ] Utilisateur créé dans auth.users
- [ ] Profil créé dans user_profiles
- [ ] Email ajouté à la queue
- [ ] Email envoyé avec bon lien
- [ ] Lien de mot de passe fonctionnel
- [ ] Connexion possible après création mot de passe
- [ ] Accès aux fonctionnalités selon le plan

## 🚨 **Erreurs communes**

### **"Signature invalide"**
- Vérifier STRIPE_WEBHOOK_SECRET
- Ou désactiver la vérification en dev

### **"Email non envoyé"**
- Vérifier RESEND_API_KEY
- Vérifier la fonction send-emails

### **"Utilisateur non créé"**
- Vérifier les permissions Supabase
- Vérifier les politiques RLS

### **"Redirection échoue"**
- Vérifier les URLs de redirection
- Vérifier les variables d'environnement frontend