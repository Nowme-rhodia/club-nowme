# Flow 2 : Candidature Partenaire

## 📋 Vue d'ensemble

Ce flow gère la candidature d'un nouveau partenaire souhaitant proposer ses offres sur la plateforme Nowme Club.

## 🎯 Objectif

Permettre à un professionnel (restaurant, spa, coach, etc.) de créer un compte partenaire et soumettre sa candidature pour validation par l'équipe admin.

## 🔄 Étapes du Flow

### 1. Accès au Formulaire de Candidature

**Page** : `/partner/signup` (`src/pages/partner/SignUp.tsx`)

**Actions** :
- Le partenaire potentiel accède au formulaire d'inscription
- Affichage du formulaire avec les champs requis

**Tables impliquées** : Aucune (page d'accès)

---

### 2. Remplissage du Formulaire

**Champs requis** :
- **Nom de l'entreprise** (`businessName`)
- **Nom du contact** (`contactName`)
- **Email** (`email`)
- **Téléphone** (`phone`)
- **Mot de passe** (`password`)
- **Confirmation du mot de passe** (`confirmPassword`)

**Validation** :
- Tous les champs sont obligatoires
- Les mots de passe doivent correspondre
- Format email valide
- Mot de passe minimum 6 caractères

---

### 3. Soumission du Formulaire

**Code** : `src/pages/partner/SignUp.tsx` (ligne 21-57)

**Actions** :

1. **Création du compte auth** :
   ```typescript
   await signUp(formData.email, formData.password);
   ```

2. **Récupération de l'utilisateur créé** :
   ```typescript
   const { data: userData } = await supabase.auth.getUser();
   ```

3. **Création du profil partenaire** :
   ```typescript
   const { error: partnerError } = await supabase
     .from('partners')
     .insert({
       user_id: userData.user.id,
       business_name: formData.businessName,
       contact_name: formData.contactName,
       phone: formData.phone,
     });
   ```

4. **Redirection** vers `/partner/dashboard`

**Tables impliquées** :
- `auth.users`
- `partners`

---

### 4. Création de l'Entrée dans la Table Partners

**Table** : `partners`

**Schéma** :
```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  description TEXT,
  category TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  
  -- Statut de validation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_account_status TEXT,
  
  -- Flags
  is_active BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);
```

**Valeurs par défaut** :
- `status` = `'pending'`
- `is_active` = `false`
- `is_verified` = `false`

---

### 5. Notification Admin (Email)

**Edge Function** : `supabase/functions/send-partner-notification/`

**Déclencheur** : Trigger sur `INSERT` dans `partners`

**Actions** :
1. Détection d'un nouveau partenaire
2. Envoi d'un email à l'équipe admin :
   - Nom de l'entreprise
   - Contact
   - Email et téléphone
   - Lien vers la page d'approbation admin

**Email envoyé à** : `admin@nowme.fr` (ou email configuré)

**Contenu type** :
```
Nouvelle demande de partenariat

Entreprise : [business_name]
Contact : [contact_name]
Email : [contact_email]
Téléphone : [phone]

Voir la demande : https://app.nowme.fr/admin/pending-partners
```

---

### 6. Email de Confirmation au Partenaire

**Edge Function** : `supabase/functions/send-partner-confirmation/`

**Actions** :
- Envoi d'un email au partenaire confirmant la réception de sa candidature
- Information sur les prochaines étapes
- Délai de traitement estimé (24-48h)

**Contenu type** :
```
Bonjour [contact_name],

Merci pour votre candidature à Nowme Club !

Nous avons bien reçu votre demande pour [business_name].
Notre équipe va l'examiner dans les prochaines 24-48 heures.

Vous recevrez un email dès que votre compte sera validé.

À très bientôt,
L'équipe Nowme
```

---

### 7. Dashboard Partenaire (En Attente)

**Page** : `/partner/dashboard` (`src/pages/partner/Dashboard.tsx`)

**État** : Compte en attente de validation

**Affichage** :
- Message "Votre compte est en cours de validation"
- Statut : `pending`
- Informations du profil
- Impossibilité de créer des offres tant que non approuvé

**Restrictions** :
- ❌ Création d'offres désactivée
- ❌ Accès aux statistiques limité
- ✅ Modification du profil possible
- ✅ Visualisation des informations

---

## 🗄️ Tables de la Base de Données

### Table `partners`

**Colonnes principales** :
- `id` : UUID unique
- `user_id` : Référence vers `auth.users`
- `business_name` : Nom de l'entreprise
- `contact_name` : Nom du contact
- `contact_email` : Email de contact
- `phone` : Téléphone
- `status` : `'pending'` | `'approved'` | `'rejected'`
- `is_active` : Compte actif ou non
- `stripe_account_id` : ID Stripe Connect (rempli après approbation)

**Index** :
```sql
CREATE INDEX idx_partners_user_id ON partners(user_id);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_email ON partners(contact_email);
```

---

## 🔐 Sécurité (RLS)

### Policies `partners`

```sql
-- Les partenaires peuvent voir leur propre profil
CREATE POLICY "Partners can view own profile"
  ON partners FOR SELECT
  USING (user_id = auth.uid());

-- Les partenaires peuvent modifier leur propre profil
CREATE POLICY "Partners can update own profile"
  ON partners FOR UPDATE
  USING (user_id = auth.uid());

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all partners"
  ON partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Service role a tous les droits
CREATE POLICY "Service role full access"
  ON partners FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 🔄 Triggers et Fonctions

### Trigger : Notification Admin

```sql
CREATE OR REPLACE FUNCTION notify_admin_new_partner()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler l'Edge Function pour envoyer l'email
  PERFORM net.http_post(
    url := 'https://[project-id].supabase.co/functions/v1/send-partner-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'partner_id', NEW.id,
      'business_name', NEW.business_name,
      'contact_name', NEW.contact_name,
      'contact_email', NEW.contact_email,
      'phone', NEW.phone
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_partner_created
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_partner();
```

### Trigger : Email de Confirmation

```sql
CREATE OR REPLACE FUNCTION send_partner_confirmation_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://[project-id].supabase.co/functions/v1/send-partner-confirmation',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'partner_id', NEW.id,
      'email', NEW.contact_email,
      'contact_name', NEW.contact_name,
      'business_name', NEW.business_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_partner_confirmation
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION send_partner_confirmation_email();
```

---

## ⚠️ Points d'Attention / Problèmes Actuels

### 🔴 Problèmes identifiés

1. **Pas de validation des données**
   - Numéro de téléphone non validé
   - Format email vérifié côté frontend uniquement
   - Pas de vérification SIRET/SIREN

2. **Profil incomplet**
   - Manque d'informations sur l'activité
   - Pas de documents justificatifs (Kbis, assurance, etc.)
   - Pas de photos/portfolio

3. **Email de confirmation**
   - Risque de spam si pas de vérification email
   - Pas de système anti-abus

4. **Synchronisation auth ↔ partners**
   - Si la création du partenaire échoue, l'utilisateur auth existe quand même
   - Pas de rollback automatique

### ✅ Solutions recommandées

1. **Validation côté serveur**
   - Vérifier le format du téléphone
   - Vérifier l'unicité de l'email
   - Ajouter un CAPTCHA

2. **Formulaire en plusieurs étapes**
   - Étape 1 : Informations de base
   - Étape 2 : Détails de l'entreprise
   - Étape 3 : Documents justificatifs
   - Étape 4 : Validation finale

3. **Vérification email**
   - Envoyer un lien de confirmation
   - Bloquer l'accès tant que l'email n'est pas vérifié

4. **Transaction atomique**
   - Utiliser une transaction pour créer auth + partner
   - Rollback si échec

---

## 🧪 Tests Recommandés

1. ✅ Création de compte partenaire
2. ✅ Validation des champs obligatoires
3. ✅ Vérification des mots de passe
4. ✅ Email de notification admin envoyé
5. ✅ Email de confirmation partenaire envoyé
6. ✅ Profil créé avec status `pending`
7. ✅ Accès au dashboard en mode "en attente"
8. ✅ Impossibilité de créer des offres
9. ✅ Modification du profil possible
10. ✅ Gestion des erreurs (email déjà utilisé, etc.)

---

## 📊 Diagramme de Séquence

```
Partenaire        Frontend         Edge Function       Database         Admin
    |                |                   |                 |               |
    |-- Formulaire ->|                   |                 |               |
    |                |                   |                 |               |
    |-- Submit ----->|                   |                 |               |
    |                |                   |                 |               |
    |                |-- signUp() ------>|                 |               |
    |                |                   |-- INSERT ------>|               |
    |                |                   |              auth.users         |
    |                |                   |                 |               |
    |                |-- INSERT -------->|                 |               |
    |                |   partners        |-- INSERT ------>|               |
    |                |                   |              partners           |
    |                |                   |                 |               |
    |                |                   |<-- TRIGGER -----|               |
    |                |                   |   new partner   |               |
    |                |                   |                 |               |
    |                |                   |-- notify-admin ->               |
    |                |                   |                 |-- Email ----->|
    |                |                   |                 |   "Nouvelle   |
    |                |                   |                 |   demande"    |
    |                |                   |                 |               |
    |                |                   |-- send-confirm ->               |
    |<-- Email "Candidature reçue" -----|                 |               |
    |                |                   |                 |               |
    |                |<-- Redirect ------|                 |               |
    |                |   /partner/       |                 |               |
    |                |   dashboard       |                 |               |
    |                |                   |                 |               |
    |-- Dashboard -->|                   |                 |               |
    |   (pending)    |                   |                 |               |
```

---

## 🔗 Fichiers Concernés

### Frontend
- `src/pages/partner/SignUp.tsx`
- `src/pages/partner/Dashboard.tsx`
- `src/lib/auth.tsx`

### Backend (Edge Functions)
- `supabase/functions/send-partner-notification/`
- `supabase/functions/send-partner-confirmation/`

### Database
- Table `partners`
- Triggers sur `partners`

---

## 📝 Améliorations Futures

1. **KYC (Know Your Customer)**
   - Vérification d'identité
   - Upload de documents (Kbis, assurance)
   - Validation SIRET

2. **Onboarding guidé**
   - Wizard multi-étapes
   - Tutoriel interactif
   - Checklist de complétion

3. **Scoring automatique**
   - Analyse de la qualité de la candidature
   - Priorisation des demandes
   - Suggestions d'amélioration

4. **Intégration Stripe Connect**
   - Création automatique du compte Stripe Connect
   - Vérification bancaire
   - Configuration des payouts

---

**Dernière mise à jour** : Novembre 2024
