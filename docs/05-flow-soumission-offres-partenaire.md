# Flow 5 : Soumission d'Offres par le Partenaire

## 📋 Vue d'ensemble

Ce flow permet aux partenaires approuvés de créer et soumettre des offres (événements, réductions, consultations) qui seront ensuite validées par l'équipe admin.

## 🎯 Objectif

Permettre aux partenaires de gérer leurs offres de manière autonome tout en maintenant un contrôle qualité via validation admin.

## 🔄 Étapes du Flow

### 1. Accès au Dashboard Partenaire

**Page** : `/partner/dashboard` (`src/pages/partner/Dashboard.tsx`)

**Prérequis** :
- ✅ Compte partenaire créé
- ✅ Statut `approved`
- ✅ Authentifié

**Affichage** :
- Statistiques (réservations, revenus)
- Liste des offres actives
- Bouton "Créer une offre"

---

### 2. Page de Gestion des Offres

**Page** : `/partner/offers` (`src/pages/partner/Offers.tsx`)

**Sections** :
1. **Offres en attente** (`pending`)
2. **Offres approuvées** (`approved`)
3. **Offres actives** (`active`)
4. **Offres refusées** (`rejected`)

**Actions disponibles** :
- ➕ Créer une nouvelle offre
- ✏️ Modifier une offre
- 🗑️ Supprimer une offre (brouillon uniquement)
- 👁️ Prévisualiser
- 🔄 Activer/Désactiver

---

### 3. Création d'une Nouvelle Offre

**Bouton** : "Créer une offre" → Ouvre un modal ou redirect vers `/partner/offers/new`

**Formulaire** : Plusieurs étapes

#### Étape 1 : Informations de base

**Champs** :
- **Titre** (obligatoire, max 100 caractères)
- **Description** (obligatoire, max 1000 caractères)
- **Catégorie** (sélection dans liste)
- **Sous-catégorie** (selon catégorie)

**Validation** :
- Titre unique pour ce partenaire
- Description minimum 50 caractères
- Catégorie valide

#### Étape 2 : Localisation

**Champs** :
- **Adresse complète**
- **Code postal**
- **Ville**
- **Coordonnées GPS** (auto-remplies via Google Maps API)

**Composant** : `LocationSearch` (`src/components/LocationSearch.tsx`)

#### Étape 3 : Tarification

**Types d'offres** :
1. **Incluse dans l'abonnement** (gratuite pour les membres)
2. **Payante** (prix supplémentaire)
3. **Réduction** (prix barré + prix membre)

**Champs** :
- **Type de tarification**
- **Prix normal** (si applicable)
- **Prix promotionnel** (optionnel)
- **Durée** (ex: "2 heures", "Journée")

**Table** : `offer_prices`

```sql
CREATE TABLE offer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  name TEXT,
  price DECIMAL(10,2),
  promo_price DECIMAL(10,2),
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Étape 4 : Disponibilité

**Options** :

**Option A : Événement à date fixe**
- Date et heure de l'événement
- Nombre de places disponibles
- Gestion du stock

**Option B : Réservation via agenda (Calendly)**
- Lien Calendly
- `requires_agenda = true`
- `calendly_url = "https://calendly.com/..."`

**Option C : Offre permanente**
- Pas de date spécifique
- Disponible en continu
- Exemple : réduction restaurant

**Champs** :
```typescript
{
  requires_agenda: boolean,
  calendly_url: string | null,
  has_stock: boolean,
  stock: number | null,
  event_date: Date | null,
  event_time: Time | null
}
```

#### Étape 5 : Médias

**Upload d'images** :
- Image principale (obligatoire)
- Images supplémentaires (max 5)
- Format : JPG, PNG, WebP
- Taille max : 5 MB par image
- Dimensions recommandées : 1200x800px

**Stockage** :
- Supabase Storage bucket `offer-images`
- URL publique générée
- Sauvegarde dans `offer_media`

**Table** : `offer_media`

```sql
CREATE TABLE offer_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('image', 'video')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Étape 6 : Validation et Soumission

**Récapitulatif** :
- Prévisualisation de l'offre
- Vérification des informations
- Conditions générales

**Actions** :
- **Enregistrer en brouillon** (`status = 'draft'`)
- **Soumettre pour validation** (`status = 'pending'`)

---

### 4. Enregistrement de l'Offre

**Code** : `src/pages/partner/Offers.tsx`

```typescript
const handleSubmitOffer = async (offerData) => {
  // 1. Créer l'offre
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .insert({
      partner_id: partnerId,
      title: offerData.title,
      description: offerData.description,
      category_id: offerData.categoryId,
      location: offerData.location,
      address: offerData.address,
      city: offerData.city,
      postal_code: offerData.postalCode,
      latitude: offerData.latitude,
      longitude: offerData.longitude,
      requires_agenda: offerData.requiresAgenda,
      calendly_url: offerData.calendlyUrl,
      has_stock: offerData.hasStock,
      stock: offerData.stock,
      status: 'pending', // En attente de validation
      is_active: false
    })
    .select()
    .single();

  if (offerError) throw offerError;

  // 2. Ajouter les prix
  if (offerData.prices && offerData.prices.length > 0) {
    const { error: pricesError } = await supabase
      .from('offer_prices')
      .insert(
        offerData.prices.map(price => ({
          offer_id: offer.id,
          name: price.name,
          price: price.price,
          promo_price: price.promoPrice,
          duration: price.duration
        }))
      );
    
    if (pricesError) throw pricesError;
  }

  // 3. Ajouter les médias
  if (offerData.media && offerData.media.length > 0) {
    const { error: mediaError } = await supabase
      .from('offer_media')
      .insert(
        offerData.media.map((media, index) => ({
          offer_id: offer.id,
          url: media.url,
          type: 'image',
          order_index: index
        }))
      );
    
    if (mediaError) throw mediaError;
  }

  // 4. Notification admin
  await supabase.functions.invoke('send-offer-notification', {
    body: {
      offerId: offer.id,
      partnerId: partnerId,
      offerTitle: offerData.title
    }
  });

  return offer;
};
```

---

### 5. Notification Admin

**Edge Function** : `supabase/functions/send-offer-notification/`

**Déclencheur** : Trigger sur `INSERT` dans `offers` avec `status = 'pending'`

**Email envoyé à** : `admin@nowme.fr`

**Contenu** :
```
Nouvelle offre à valider

Partenaire : [business_name]
Offre : [title]
Catégorie : [category]
Localisation : [city]

Voir l'offre : https://app.nowme.fr/admin/pending-offers/[offer_id]

Approuver | Refuser
```

---

### 6. Email de Confirmation au Partenaire

**Edge Function** : `supabase/functions/send-offer-submission/`

**Contenu** :
```
Offre soumise avec succès

Bonjour [contact_name],

Ton offre "[title]" a bien été soumise pour validation.

Notre équipe va l'examiner dans les prochaines 24-48 heures.
Tu recevras un email dès qu'elle sera approuvée ou si des modifications sont nécessaires.

Voir mon offre : https://app.nowme.fr/partner/offers/[offer_id]

L'équipe Nowme
```

---

### 7. Statut "En Attente" dans le Dashboard

**Page** : `/partner/offers`

**Affichage** :
- Badge "En attente de validation"
- Icône ⏱️ (Clock)
- Couleur jaune
- Impossible de modifier (ou modifications limitées)

**Actions disponibles** :
- ❌ Modifier (désactivé)
- ❌ Supprimer (désactivé)
- ✅ Prévisualiser
- ✅ Annuler la soumission (repasse en brouillon)

---

## 🗄️ Tables de la Base de Données

### Table `offers`

**Schéma complet** :
```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Informations de base
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  subcategory_id UUID REFERENCES subcategories(id),
  
  -- Localisation
  location TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Disponibilité
  requires_agenda BOOLEAN DEFAULT false,
  calendly_url TEXT,
  has_stock BOOLEAN DEFAULT false,
  stock INTEGER,
  event_date DATE,
  event_time TIME,
  
  -- Statut et validation
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending', 'approved', 'rejected', 'active', 'inactive'
  )),
  is_active BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  
  -- Métadonnées
  rating DECIMAL(3, 2),
  views_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

-- Index
CREATE INDEX idx_offers_partner_id ON offers(partner_id);
CREATE INDEX idx_offers_category_id ON offers(category_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_city ON offers(city);
CREATE INDEX idx_offers_is_active ON offers(is_active);
```

### Table `categories`

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 Sécurité (RLS)

### Policies `offers`

```sql
-- Les partenaires peuvent voir leurs propres offres
CREATE POLICY "Partners can view own offers"
  ON offers FOR SELECT
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

-- Les partenaires peuvent créer des offres
CREATE POLICY "Partners can create offers"
  ON offers FOR INSERT
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

-- Les partenaires peuvent modifier leurs offres (sauf si approuvées)
CREATE POLICY "Partners can update own offers"
  ON offers FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
    AND status IN ('draft', 'rejected')
  );

-- Les partenaires peuvent supprimer leurs brouillons
CREATE POLICY "Partners can delete drafts"
  ON offers FOR DELETE
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- Les membres peuvent voir les offres actives
CREATE POLICY "Members can view active offers"
  ON offers FOR SELECT
  USING (status = 'approved' AND is_active = true);

-- Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can manage all offers"
  ON offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Service role a tous les droits
CREATE POLICY "Service role full access"
  ON offers FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 🔄 Triggers et Fonctions

### Trigger : Notification Admin

```sql
CREATE OR REPLACE FUNCTION notify_admin_new_offer()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement si l'offre passe à 'pending'
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    PERFORM net.http_post(
      url := 'https://[project-id].supabase.co/functions/v1/send-offer-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'offer_id', NEW.id,
        'partner_id', NEW.partner_id,
        'title', NEW.title
      )
    );
    
    -- Mettre à jour submitted_at
    NEW.submitted_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_offer_submitted
  BEFORE INSERT OR UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_offer();
```

### Trigger : Mise à jour automatique

```sql
CREATE OR REPLACE FUNCTION update_offer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER offer_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offer_timestamp();
```

---

## ⚠️ Points d'Attention / Problèmes Actuels

### 🔴 Problèmes identifiés

1. **Upload d'images**
   - Pas de compression automatique
   - Pas de validation du format
   - Risque de fichiers trop lourds

2. **Validation des données**
   - Pas de vérification de l'adresse
   - Coordonnées GPS non validées
   - Prix négatifs possibles

3. **Gestion des brouillons**
   - Pas de limite de brouillons
   - Pas de nettoyage automatique
   - Brouillons jamais soumis qui restent

4. **Intégration Calendly**
   - Pas de validation du lien
   - Pas de vérification de disponibilité
   - Pas de synchronisation

### ✅ Solutions recommandées

1. **Optimisation des images**
   - Compression automatique (Sharp, ImageMagick)
   - Redimensionnement aux bonnes dimensions
   - Conversion en WebP
   - CDN pour le delivery

2. **Validation stricte**
   - Vérifier l'adresse via Google Maps API
   - Valider les coordonnées GPS
   - Contraintes CHECK sur les prix
   - Validation du format Calendly

3. **Nettoyage automatique**
   - Supprimer les brouillons > 30 jours
   - Archiver les offres inactives
   - Notification avant suppression

4. **Webhook Calendly**
   - Vérifier la validité du lien
   - Synchroniser les disponibilités
   - Mettre à jour le stock automatiquement

---

## 🧪 Tests Recommandés

1. ✅ Création d'offre en brouillon
2. ✅ Soumission d'offre pour validation
3. ✅ Upload d'images
4. ✅ Validation des champs obligatoires
5. ✅ Intégration Calendly
6. ✅ Gestion du stock
7. ✅ Email de notification admin
8. ✅ Email de confirmation partenaire
9. ✅ Modification d'un brouillon
10. ✅ Impossible de modifier une offre approuvée
11. ✅ Suppression d'un brouillon
12. ✅ Prévisualisation de l'offre

---

## 📊 Diagramme de Séquence

```
Partenaire      Frontend         Function        Database         Admin
    |               |                |               |               |
    |-- Dashboard ->|                |               |               |
    |               |                |               |               |
    |-- Créer offre|                |               |               |
    |               |                |               |               |
    |-- Formulaire->|                |               |               |
    |   (étapes)    |                |               |               |
    |               |                |               |               |
    |-- Upload ---->|                |               |               |
    |   images      |-- Storage ---->               |               |
    |               |                |        Supabase Storage       |
    |               |                |               |               |
    |-- Soumettre ->|                |               |               |
    |               |-- INSERT ------>               |               |
    |               |   offer        |        offers |               |
    |               |   (pending)    |               |               |
    |               |                |               |               |
    |               |-- INSERT ------>               |               |
    |               |   prices       |   offer_prices|               |
    |               |                |               |               |
    |               |-- INSERT ------>               |               |
    |               |   media        |   offer_media |               |
    |               |                |               |               |
    |               |                |<-- TRIGGER ---|               |
    |               |                |   new offer   |               |
    |               |                |               |               |
    |               |                |-- notify-admin ->             |
    |               |                |               |-- Email ----->|
    |               |                |               |   "Nouvelle   |
    |               |                |               |   offre"      |
    |               |                |               |               |
    |               |                |-- send-confirmation ->        |
    |<-- Email "Offre soumise" ------|               |               |
    |               |                |               |               |
    |               |<-- Success ----|               |               |
    |<-- Toast "Offre soumise !"     |               |               |
    |               |                |               |               |
    |-- Voir offres>|                |               |               |
    |   (pending)   |-- SELECT ------>               |               |
    |               |                |        offers |               |
```

---

## 🔗 Fichiers Concernés

### Frontend
- `src/pages/partner/Offers.tsx`
- `src/pages/partner/Dashboard.tsx`
- `src/components/LocationSearch.tsx`

### Backend (Edge Functions)
- `supabase/functions/send-offer-notification/`
- `supabase/functions/send-offer-submission/`

### Database
- Table `offers`
- Table `offer_prices`
- Table `offer_media`
- Table `categories`
- Triggers sur `offers`

---

## 📝 Améliorations Futures

1. **Template d'offres**
   - Modèles pré-remplis par catégorie
   - Duplication d'offres existantes
   - Import en masse

2. **Planification**
   - Programmer la publication
   - Offres récurrentes (hebdomadaires, mensuelles)
   - Gestion de calendrier

3. **Analytics**
   - Vues de l'offre
   - Taux de conversion
   - Revenus générés
   - Comparaison avec d'autres offres

4. **A/B Testing**
   - Tester différents titres
   - Tester différentes images
   - Optimiser les conversions

---

**Dernière mise à jour** : Novembre 2024
