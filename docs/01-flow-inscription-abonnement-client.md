# Flow 1 : Inscription Client + Abonnement + Gestion Utilisateur

## 📋 Vue d'ensemble

Ce flow gère l'inscription d'un nouveau client, la souscription à un abonnement (mensuel ou annuel) et la gestion complète du profil utilisateur.

## 🎯 Objectif

Permettre à un visiteur de créer un compte, choisir un abonnement et devenir un membre actif de la plateforme Nowme Club.

## 🔄 Étapes du Flow

### 1. Sélection du Plan d'Abonnement

**Page** : `/subscription` (`src/pages/Subscription.tsx`)

**Actions** :
- L'utilisateur consulte les différents plans disponibles :
  - **Plan Mensuel** : 12,99€ le 1er mois, puis 39,99€/mois
  - **Plan Annuel** : 399€/an (économie de 80€ + 100€ de réduction sur les séjours)
- L'utilisateur clique sur "Je commence à 12,99€" ou "Je choisis l'annuel"
- Redirection vers `/auth/signup?plan=monthly` ou `/auth/signup?plan=yearly`

**Tables impliquées** : Aucune (page informative)

---

### 2. Création du Compte Utilisateur

**Page** : `/auth/signup` (`src/pages/auth/SignUp.tsx`)

**Actions** :
1. L'utilisateur remplit le formulaire :
   - Prénom
   - Nom
   - Email
   - Mot de passe (minimum 6 caractères)

2. **Étape 1** : Création dans `auth.users`
   ```typescript
   const { data: authData, error } = await supabase.auth.signUp({
     email: formData.email,
     password: formData.password,
     options: {
       emailRedirectTo: `${window.location.origin}/checkout?plan=${plan}`,
       data: {
         first_name: formData.firstName,
         last_name: formData.lastName,
       }
     }
   });
   ```

3. **Étape 2** : Création du profil via Edge Function
   ```typescript
   // Appel à /functions/v1/link-auth-to-profile
   const profileResponse = await fetch(`${apiUrl}/functions/v1/link-auth-to-profile`, {
     method: 'POST',
     body: JSON.stringify({
       email: formData.email,
       authUserId: authData.user.id,
       role: 'subscriber'
     })
   });
   ```

4. **Étape 3** : Mise à jour du profil avec prénom/nom
   ```typescript
   await supabase
     .from('user_profiles')
     .update({
       first_name: formData.firstName,
       last_name: formData.lastName,
     })
     .eq('user_id', authData.user.id);
   ```

5. Stockage temporaire dans `sessionStorage` :
   - `signup_email`
   - `signup_user_id`

6. Redirection vers `/checkout?plan=${plan}&email=${email}`

**Tables impliquées** :
- `auth.users` (Supabase Auth)
- `user_profiles`

**Schéma `user_profiles`** :
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_type TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3. Page de Checkout

**Page** : `/checkout` (`src/pages/Checkout.tsx`)

**Actions** :
1. Affichage du plan sélectionné avec ses avantages
2. Récupération de l'email depuis :
   - URL parameter `?email=...`
   - `sessionStorage.getItem('signup_email')`
   - Profil utilisateur connecté

3. Clic sur "Finaliser mon abonnement"
4. Appel à `createCheckoutSession()` (`src/lib/stripe.ts`)

**Tables impliquées** : Aucune (lecture uniquement)

---

### 4. Création de la Session Stripe

**Fonction** : `createCheckoutSession()` dans `src/lib/stripe.ts`

**Actions** :
1. Appel à l'Edge Function `/functions/v1/create-subscription-session`
2. Création d'une session Stripe Checkout avec :
   - Email du client
   - Plan sélectionné (monthly/yearly)
   - Price ID Stripe correspondant
   - URL de succès : `/subscription-success`
   - URL d'annulation : `/checkout?plan=${plan}`

3. Redirection vers Stripe Checkout

**Edge Function** : `supabase/functions/create-subscription-session/index.ts`

**Tables impliquées** :
- Potentiellement `pending_signups` (pour tracer les tentatives)

**Schéma `pending_signups`** :
```sql
CREATE TABLE pending_signups (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_type TEXT,
  amount_paid INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 5. Paiement Stripe

**Plateforme** : Stripe Checkout (externe)

**Actions** :
1. L'utilisateur entre ses informations de paiement
2. Stripe traite le paiement
3. Stripe envoie un webhook `checkout.session.completed`

---

### 6. Traitement du Webhook Stripe

**Edge Function** : `supabase/functions/stripe-webhook/index.ts`

**Événement** : `checkout.session.completed`

**Actions** :
1. Vérification de la signature du webhook
2. Récupération des données de la session :
   - `customer` (Stripe Customer ID)
   - `subscription` (Stripe Subscription ID)
   - `customer_email`
   - `metadata` (plan type, user_id si disponible)

3. **Mise à jour de `user_profiles`** :
   ```sql
   UPDATE user_profiles
   SET 
     stripe_customer_id = '...',
     stripe_subscription_id = '...',
     subscription_status = 'active',
     subscription_type = 'monthly' | 'yearly',
     updated_at = now()
   WHERE email = customer_email;
   ```

4. **Création/Mise à jour dans `subscriptions`** :
   ```sql
   INSERT INTO subscriptions (
     user_id,
     stripe_subscription_id,
     stripe_customer_id,
     status,
     current_period_start,
     current_period_end,
     plan_type
   ) VALUES (...);
   ```

5. **Enregistrement du webhook** dans `stripe_webhook_events` :
   ```sql
   INSERT INTO stripe_webhook_events (
     stripe_event_id,
     event_type,
     status,
     raw_event,
     processed_at
   ) VALUES (...);
   ```

6. **Envoi d'email de bienvenue** via Edge Function `send-emails`

**Tables impliquées** :
- `user_profiles`
- `subscriptions`
- `stripe_webhook_events`

**Schéma `subscriptions`** :
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  status TEXT NOT NULL,
  plan_type TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Schéma `stripe_webhook_events`** :
```sql
CREATE TABLE stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  error_message TEXT,
  raw_event JSONB,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 7. Page de Succès

**Page** : `/subscription-success` (`src/pages/SubscriptionSuccess.tsx`)

**Actions** :
1. Affichage d'un message de confirmation
2. Récapitulatif de l'abonnement
3. Lien vers le dashboard : `/club/dashboard`

---

### 8. Gestion de l'Utilisateur

**Pages** :
- `/account` : Gestion du profil
- `/club/dashboard` : Dashboard membre

**Actions disponibles** :
- Modifier les informations personnelles
- Voir l'historique des réservations
- Gérer l'abonnement (via Stripe Customer Portal)
- Annuler l'abonnement

**Edge Function pour le portail client** : `create-portal-session`

---

## 🗄️ Tables de la Base de Données

### Tables principales

1. **`auth.users`** (Supabase Auth)
   - Gestion de l'authentification
   - Stockage des credentials

2. **`user_profiles`**
   - Profil utilisateur complet
   - Lien avec Stripe
   - Statut d'abonnement

3. **`subscriptions`**
   - Détails de l'abonnement Stripe
   - Périodes de facturation
   - Statut actif/annulé

4. **`pending_signups`**
   - Inscriptions en cours
   - Traçabilité des tentatives

5. **`stripe_webhook_events`**
   - Log de tous les événements Stripe
   - Idempotence et debugging

---

## 🔐 Sécurité (RLS - Row Level Security)

### Policies `user_profiles`
```sql
-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Service role a tous les droits
CREATE POLICY "Service role full access"
  ON user_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### Policies `subscriptions`
```sql
-- Les utilisateurs peuvent voir leur propre abonnement
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role a tous les droits
CREATE POLICY "subscriptions_service_role"
  ON subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 🔄 Webhooks Stripe Gérés

| Événement | Action |
|-----------|--------|
| `checkout.session.completed` | Activation de l'abonnement |
| `invoice.payment_succeeded` | Renouvellement réussi |
| `customer.subscription.updated` | Mise à jour de l'abonnement |
| `customer.subscription.deleted` | Annulation de l'abonnement |
| `payment_intent.succeeded` | Paiement réussi |
| `charge.refunded` | Remboursement |

---

## 📧 Emails Envoyés

1. **Email de confirmation d'inscription** (Supabase Auth)
2. **Email de bienvenue** (après paiement réussi)
3. **Email de confirmation d'abonnement** (Stripe)
4. **Emails de renouvellement** (Stripe)
5. **Email d'annulation** (si annulation)

---

## ⚠️ Points d'Attention / Problèmes Actuels

### 🔴 Problèmes identifiés

1. **Synchronisation auth.users ↔ user_profiles**
   - Risque de profils orphelins
   - Nécessite la fonction `link-auth-to-profile`

2. **Gestion des erreurs de paiement**
   - Que se passe-t-il si le webhook échoue ?
   - Retry mechanism ?

3. **Idempotence des webhooks**
   - Vérifier que `stripe_event_id` est unique
   - Éviter les doublons de traitement

4. **Email de confirmation**
   - Supabase Auth envoie un email de confirmation
   - Peut créer de la confusion avec l'email de bienvenue

### ✅ Solutions recommandées

1. **Trigger automatique** pour créer `user_profiles` lors de la création dans `auth.users`
2. **Queue de retry** pour les webhooks échoués
3. **Table de log détaillée** pour le debugging
4. **Désactiver l'email de confirmation** Supabase si non nécessaire

---

## 🧪 Tests Recommandés

1. ✅ Inscription avec plan mensuel
2. ✅ Inscription avec plan annuel
3. ✅ Paiement réussi
4. ✅ Paiement échoué
5. ✅ Webhook reçu et traité
6. ✅ Profil créé correctement
7. ✅ Abonnement actif dans la base
8. ✅ Email de bienvenue envoyé
9. ✅ Accès au dashboard membre
10. ✅ Annulation d'abonnement

---

## 📊 Diagramme de Séquence

```
Utilisateur          Frontend          Edge Function        Stripe          Database
    |                   |                    |                 |                |
    |-- Choisit plan -->|                    |                 |                |
    |                   |                    |                 |                |
    |-- Remplit form -->|                    |                 |                |
    |                   |                    |                 |                |
    |                   |-- signUp() ------->|                 |                |
    |                   |                    |                 |                |
    |                   |                    |-- INSERT ------>|                |
    |                   |                    |                 |         auth.users
    |                   |                    |                 |                |
    |                   |-- link-profile --->|                 |                |
    |                   |                    |-- INSERT ------>|                |
    |                   |                    |                 |      user_profiles
    |                   |                    |                 |                |
    |                   |<-- Redirect -------|                 |                |
    |                   |   /checkout        |                 |                |
    |                   |                    |                 |                |
    |-- Clic payer ---->|                    |                 |                |
    |                   |                    |                 |                |
    |                   |-- create-session ->|                 |                |
    |                   |                    |-- POST -------->|                |
    |                   |                    |                 |   Checkout     |
    |                   |                    |<-- session_url -|   Session      |
    |                   |<-- Redirect -------|                 |                |
    |                   |   Stripe           |                 |                |
    |                   |                    |                 |                |
    |-- Paie -------------------------------->|                 |                |
    |                   |                    |                 |                |
    |                   |                    |<-- webhook -----|                |
    |                   |                    |   completed     |                |
    |                   |                    |                 |                |
    |                   |                    |-- UPDATE ------>|                |
    |                   |                    |                 |      user_profiles
    |                   |                    |                 |      subscriptions
    |                   |                    |                 |                |
    |                   |                    |-- send-email -->|                |
    |                   |                    |                 |                |
    |<-- Email bienvenue -------------------|                 |                |
    |                   |                    |                 |                |
    |                   |<-- Redirect -------|                 |                |
    |                   |   /success         |                 |                |
```

---

## 🔗 Fichiers Concernés

### Frontend
- `src/pages/Subscription.tsx`
- `src/pages/auth/SignUp.tsx`
- `src/pages/Checkout.tsx`
- `src/pages/SubscriptionSuccess.tsx`
- `src/lib/stripe.ts`
- `src/lib/auth.tsx`

### Backend (Edge Functions)
- `supabase/functions/link-auth-to-profile/`
- `supabase/functions/create-subscription-session/`
- `supabase/functions/stripe-webhook/`
- `supabase/functions/send-emails/`
- `supabase/functions/stripe-user-welcome/`

### Migrations
- `supabase/migrations/20250806104424_late_jungle.sql` (pending_signups)
- `supabase/migrations/migration3009.sql` (RLS policies)

---

**Dernière mise à jour** : Novembre 2025
