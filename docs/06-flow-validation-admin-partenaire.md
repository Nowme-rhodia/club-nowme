# Flow 6 : Validation Admin - Approbation/Rejet Partenaire

## 📋 Vue d'ensemble

Ce flow gère la validation des demandes de partenariat par l'équipe admin, incluant l'approbation ou le rejet des candidatures.

## 🎯 Objectif

Permettre aux administrateurs de valider la qualité des partenaires avant qu'ils puissent créer des offres et apparaître sur la plateforme.

## 🔄 Étapes du Flow

### 1. Notification de Nouvelle Demande

**Déclencheur** : Création d'un nouveau partenaire (voir Flow 2)

**Email reçu par** : Équipe admin (`admin@nowme.fr`)

**Contenu** :
```
Nouvelle demande de partenariat

Entreprise : [business_name]
Contact : [contact_name]
Email : [contact_email]
Téléphone : [phone]
Date : [created_at]

Voir la demande : https://app.nowme.fr/admin/pending-partners
```

---

### 2. Accès au Dashboard Admin

**Page** : `/admin/pending-partners` (`src/pages/admin/PendingPartners.tsx`)

**Authentification** :
- Utilisateur connecté
- `is_admin = true` dans `user_profiles`

**Vérification RLS** :
```sql
CREATE POLICY "Admins can view all partners"
  ON partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
```

---

### 3. Liste des Demandes en Attente

**Code** : `src/pages/admin/PendingPartners.tsx` (ligne 57-76)

**Chargement des données** :
```typescript
const loadPartners = async () => {
  let query = supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  setPartners(data || []);
};
```

**Filtres disponibles** :
- **Par statut** : `pending`, `approved`, `rejected`, `all`
- **Par recherche** : Nom entreprise, contact, email
- **Par tri** : Date (récent/ancien), Nom (A-Z/Z-A)

**Affichage pour chaque demande** :
- Nom de l'entreprise
- Nom du contact
- Email et téléphone
- Date de soumission
- Badge de statut (couleur selon statut)
- Actions : Approuver / Refuser

---

### 4. Consultation du Détail

**Informations affichées** :
- **Informations entreprise** :
  - Nom commercial
  - Catégorie d'activité
  - Description
  - Site web
  - Réseaux sociaux

- **Informations contact** :
  - Nom du responsable
  - Email
  - Téléphone
  - Adresse

- **Informations légales** (si disponibles) :
  - SIRET
  - Assurance professionnelle
  - Documents justificatifs

---

### 5. Approbation du Partenaire

**Action** : Clic sur le bouton "Approuver" (icône ✓)

**Code** : `src/pages/admin/PendingPartners.tsx` (ligne 78-85)

```typescript
const handleApprove = async (partner: Partner) => {
  try {
    await approvePartner(partner.id as string);
    await loadPartners();
  } catch (error) {
    console.error('Error approving partner:', error);
  }
};
```

**Fonction** : `approvePartner()` dans `src/lib/partner.ts`

```typescript
export async function approvePartner(partnerId: string) {
  // 1. Mettre à jour le statut
  const { error: updateError } = await supabase
    .from('partners')
    .update({
      status: 'approved',
      is_active: true,
      is_verified: true,
      approved_at: new Date().toISOString()
    })
    .eq('id', partnerId);

  if (updateError) throw updateError;

  // 2. Créer un compte Stripe Connect (optionnel)
  const { data, error: stripeError } = await supabase.functions.invoke(
    'create-stripe-connect-account',
    {
      body: { partnerId }
    }
  );

  if (stripeError) {
    console.warn('Stripe Connect creation failed:', stripeError);
    // Continue quand même
  }

  // 3. Envoyer l'email d'approbation
  await supabase.functions.invoke('send-partner-approval', {
    body: { partnerId }
  });

  return { success: true };
}
```

---

### 6. Email d'Approbation au Partenaire

**Edge Function** : `supabase/functions/send-partner-approval/`

**Contenu** :
```
🎉 Félicitations ! Ton compte partenaire est approuvé

Bonjour [contact_name],

Excellente nouvelle ! Ton compte partenaire pour [business_name] a été approuvé.

Tu peux maintenant :
✅ Créer et gérer tes offres
✅ Suivre tes réservations
✅ Accéder à tes statistiques
✅ Configurer tes paiements

Prochaines étapes :
1. Connecte-toi à ton espace partenaire
2. Configure ton compte Stripe Connect pour recevoir tes paiements
3. Crée ta première offre

Accéder à mon espace : https://app.nowme.fr/partner/dashboard

Besoin d'aide ? Notre équipe est là pour t'accompagner.

Bienvenue dans la famille Nowme !
L'équipe Nowme
```

---

### 7. Mise à Jour du Statut en Base

**Table** : `partners`

**Changements** :
```sql
UPDATE partners
SET 
  status = 'approved',
  is_active = true,
  is_verified = true,
  approved_at = now()
WHERE id = :partner_id;
```

**Trigger** : Envoi automatique de l'email

```sql
CREATE OR REPLACE FUNCTION on_partner_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://[project-id].supabase.co/functions/v1/send-partner-approval',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('partner_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_approved_trigger
  AFTER UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION on_partner_approved();
```

---

### 8. Création du Compte Stripe Connect (Optionnel)

**Edge Function** : `supabase/functions/create-stripe-connect-account/`

**Actions** :
1. Création d'un compte Stripe Connect Express
2. Stockage du `stripe_account_id`
3. Génération du lien d'onboarding
4. Envoi du lien au partenaire

**Code** :
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

export async function createStripeConnectAccount(partnerId: string) {
  // 1. Récupérer les infos du partenaire
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .single();

  // 2. Créer le compte Stripe Connect
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email: partner.contact_email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'company',
    company: {
      name: partner.business_name,
    },
  });

  // 3. Sauvegarder l'ID
  await supabase
    .from('partners')
    .update({
      stripe_account_id: account.id,
      stripe_account_status: 'pending'
    })
    .eq('id', partnerId);

  // 4. Créer le lien d'onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://app.nowme.fr/partner/settings/payments',
    return_url: 'https://app.nowme.fr/partner/settings/payments?success=true',
    type: 'account_onboarding',
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url
  };
}
```

---

### 9. Rejet du Partenaire

**Action** : Clic sur le bouton "Refuser" (icône ✗)

**Interface** : Champ textarea pour la raison du refus

**Code** : `src/pages/admin/PendingPartners.tsx` (ligne 87-95)

```typescript
const handleReject = async (partner: Partner) => {
  try {
    const reason = rejectReasons[partner.id as string] || 'Demande refusée par l\'admin';
    await rejectPartner(partner.id as string, reason);
    await loadPartners();
  } catch (error) {
    console.error('Error rejecting partner:', error);
  }
};
```

**Fonction** : `rejectPartner()` dans `src/lib/partner.ts`

```typescript
export async function rejectPartner(partnerId: string, reason: string) {
  // 1. Mettre à jour le statut
  const { error: updateError } = await supabase
    .from('partners')
    .update({
      status: 'rejected',
      is_active: false,
      rejection_reason: reason,
      rejected_at: new Date().toISOString()
    })
    .eq('id', partnerId);

  if (updateError) throw updateError;

  // 2. Envoyer l'email de rejet
  await supabase.functions.invoke('send-partner-rejection', {
    body: {
      partnerId,
      reason
    }
  });

  return { success: true };
}
```

---

### 10. Email de Rejet au Partenaire

**Edge Function** : `supabase/functions/send-partner-rejection/`

**Contenu** :
```
Mise à jour de ta demande de partenariat

Bonjour [contact_name],

Merci pour ton intérêt pour Nowme Club.

Après examen de ta demande pour [business_name], nous ne pouvons malheureusement pas l'accepter pour le moment.

Raison : [rejection_reason]

Tu peux soumettre une nouvelle demande après avoir pris en compte ces éléments.

Si tu as des questions, n'hésite pas à nous contacter.

Cordialement,
L'équipe Nowme
```

---

### 11. Dashboard Partenaire Après Approbation

**Page** : `/partner/dashboard`

**Changements** :
- ✅ Accès complet au dashboard
- ✅ Bouton "Créer une offre" activé
- ✅ Accès aux statistiques
- ✅ Configuration Stripe Connect

**Message de bienvenue** :
```
🎉 Bienvenue dans la famille Nowme !

Ton compte est maintenant actif. Commence par :
1. Configurer tes paiements Stripe
2. Créer ta première offre
3. Compléter ton profil

Besoin d'aide ? Consulte notre guide partenaire.
```

---

## 🗄️ Tables de la Base de Données

### Table `partners`

**Colonnes de statut** :
```sql
status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
is_active BOOLEAN DEFAULT false,
is_verified BOOLEAN DEFAULT false,
rejection_reason TEXT,
approved_at TIMESTAMPTZ,
rejected_at TIMESTAMPTZ,
stripe_account_id TEXT,
stripe_account_status TEXT
```

**États possibles** :
- `pending` : En attente de validation
- `approved` : Approuvé, peut créer des offres
- `rejected` : Refusé, doit soumettre une nouvelle demande

---

## 🔐 Sécurité (RLS)

### Policies Admin

```sql
-- Les admins peuvent voir tous les partenaires
CREATE POLICY "Admins can view all partners"
  ON partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Les admins peuvent modifier tous les partenaires
CREATE POLICY "Admins can update all partners"
  ON partners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
```

---

## 🔄 Triggers et Fonctions

### Trigger : Email d'approbation

```sql
CREATE OR REPLACE FUNCTION on_partner_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://[project-id].supabase.co/functions/v1/send-partner-approval',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('partner_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Trigger : Email de rejet

```sql
CREATE OR REPLACE FUNCTION on_partner_rejected()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://[project-id].supabase.co/functions/v1/send-partner-rejection',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'partner_id', NEW.id,
        'reason', NEW.rejection_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## ⚠️ Points d'Attention / Problèmes Actuels

### 🔴 Problèmes identifiés

1. **Pas de critères de validation clairs**
   - Décision subjective
   - Pas de checklist
   - Risque d'incohérence

2. **Pas de système de notation**
   - Impossible de prioriser les demandes
   - Pas de scoring automatique

3. **Raison du refus**
   - Champ libre, pas de catégories
   - Peut être vague ou peu constructif

4. **Pas de processus de recours**
   - Partenaire refusé ne peut pas contester
   - Pas de possibilité de resoumission guidée

5. **Stripe Connect**
   - Création manuelle
   - Pas de vérification automatique
   - Onboarding non intégré

### ✅ Solutions recommandées

1. **Checklist de validation**
   - Critères objectifs (SIRET, assurance, etc.)
   - Scoring automatique
   - Recommandation approve/reject

2. **Catégories de refus**
   - Liste prédéfinie de raisons
   - Suggestions d'amélioration
   - Lien vers ressources

3. **Workflow de recours**
   - Bouton "Contester le refus"
   - Formulaire de resoumission
   - Suivi de l'historique

4. **Intégration Stripe Connect**
   - Création automatique à l'approbation
   - Onboarding intégré dans le dashboard
   - Vérification du statut

---

## 🧪 Tests Recommandés

1. ✅ Approbation d'un partenaire
2. ✅ Rejet d'un partenaire
3. ✅ Email d'approbation envoyé
4. ✅ Email de rejet envoyé
5. ✅ Mise à jour du statut en base
6. ✅ Création compte Stripe Connect
7. ✅ Accès dashboard partenaire après approbation
8. ✅ Restrictions dashboard si rejeté
9. ✅ Filtrage par statut
10. ✅ Recherche de partenaires
11. ✅ Tri par date/nom
12. ✅ Permissions admin vérifiées

---

## 📊 Diagramme de Séquence

```
Admin          Frontend         Function        Database        Partenaire
  |                |                |               |               |
  |-- Login ------>|                |               |               |
  |                |                |               |               |
  |-- Voir ------->|                |               |               |
  |   pending      |-- SELECT ------>               |               |
  |                |                |        partners|               |
  |                |                |               |               |
  |-- Approuver -->|                |               |               |
  |                |-- UPDATE ------>               |               |
  |                |   status=      |        partners|               |
  |                |   'approved'   |               |               |
  |                |                |               |               |
  |                |                |<-- TRIGGER ---|               |
  |                |                |   approved    |               |
  |                |                |               |               |
  |                |                |-- create-stripe ->            |
  |                |                |   connect     |               |
  |                |                |               |               |
  |                |                |-- send-approval ->            |
  |                |                |               |-- Email ----->|
  |                |                |               |   "Approuvé"  |
  |                |                |               |               |
  |                |<-- Success ----|               |               |
  |<-- Toast "Partenaire approuvé" |               |               |
  |                |                |               |               |
  |                |                |               |               |
  |                |         [Ou bien REJET]        |               |
  |                |                |               |               |
  |-- Refuser ---->|                |               |               |
  |   + raison     |-- UPDATE ------>               |               |
  |                |   status=      |        partners|               |
  |                |   'rejected'   |               |               |
  |                |                |               |               |
  |                |                |<-- TRIGGER ---|               |
  |                |                |   rejected    |               |
  |                |                |               |               |
  |                |                |-- send-rejection ->           |
  |                |                |               |-- Email ----->|
  |                |                |               |   "Refusé"    |
  |                |                |               |   + raison    |
```

---

## 🔗 Fichiers Concernés

### Frontend
- `src/pages/admin/PendingPartners.tsx`
- `src/lib/partner.ts`

### Backend (Edge Functions)
- `supabase/functions/send-partner-approval/`
- `supabase/functions/send-partner-rejection/`
- `supabase/functions/create-stripe-connect-account/`

### Database
- Table `partners`
- Triggers sur `partners`

---

## 📝 Métriques à Suivre

1. **Taux d'approbation** : % de partenaires approuvés
2. **Délai moyen de traitement** : Temps entre soumission et décision
3. **Raisons de refus** : Distribution des motifs
4. **Taux de resoumission** : Partenaires qui resoumettent après refus
5. **Qualité des partenaires** : Note moyenne, taux de satisfaction

---

## 📈 Dashboard Admin - Statistiques

**Métriques affichées** :
- Nombre de demandes en attente
- Nombre de partenaires actifs
- Taux d'approbation (%)
- Délai moyen de traitement
- Top catégories de partenaires

**Graphiques** :
- Évolution des demandes (par mois)
- Répartition par statut (pie chart)
- Répartition par catégorie (bar chart)

---

**Dernière mise à jour** : Novembre 2024
