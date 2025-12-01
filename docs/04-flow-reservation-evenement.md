# Flow 4 : Réservation d'Événement (Event Booking)

## 📋 Vue d'ensemble

Ce flow gère la réservation d'une offre (événement, masterclass, consultation, etc.) par un membre abonné de Nowme Club.

## 🎯 Objectif

Permettre à un membre actif de réserver une offre, effectuer le paiement si nécessaire, et recevoir une confirmation avec QR code pour validation.

## 🔄 Étapes du Flow

### 1. Navigation et Découverte des Offres

**Pages** :
- `/` : Page d'accueil avec liste des offres
- `/tous-les-kiffs` : Catalogue complet (`src/pages/TousLesKiffs.tsx`)
- `/categories` : Filtrage par catégorie

**Actions** :
- L'utilisateur parcourt les offres disponibles
- Filtrage par catégorie, région, ville
- Recherche par mot-clé
- Affichage des offres avec :
  - Image
  - Titre
  - Description courte
  - Prix (ou "Inclus dans l'abonnement")
  - Localisation
  - Note/avis

---

### 2. Consultation du Détail de l'Offre

**Page** : `/offer/:id` (`src/pages/OfferPage.tsx` ou `src/pages/Booking.tsx`)

**Chargement de l'offre** :
```typescript
const { data, error } = await supabase
  .from('offers')
  .select(`
    id,
    title,
    description,
    location,
    rating,
    requires_agenda,
    calendly_url,
    has_stock,
    stock,
    category_id,
    offer_prices(price, promo_price),
    offer_media(url),
    categories:category_id(name, slug)
  `)
  .eq('id', id)
  .single();
```

**Affichage** :
- Image principale
- Titre et description complète
- Localisation avec carte
- Prix (normal et promo si applicable)
- Stock restant (si `has_stock = true`)
- Badge de réduction
- Bouton "Réserver" (désactivé si stock = 0)

**Vérification du stock** :
```typescript
const isOutOfStock = Boolean(offer?.has_stock) && ((offer?.stock ?? 0) <= 0);
```

---

### 3. Clic sur "Réserver"

**Action** : `handleBooking()` dans `src/pages/Booking.tsx` (ligne 124-127)

```typescript
const handleBooking = () => {
  if (!offer || isOutOfStock) return;
  navigate(`/booking/${offer.id}`);
};
```

**Redirection** : `/booking/:offerId`

**Vérifications** :
- ✅ Utilisateur connecté (sinon redirect vers `/auth/signin`)
- ✅ Abonnement actif (sinon redirect vers `/subscription`)
- ✅ Stock disponible (si applicable)

---

### 4. Page de Réservation

**Page** : `/booking/:offerId` (à créer ou dans `src/pages/Booking.tsx`)

**Affichage** :
1. **Récapitulatif de l'offre** :
   - Titre
   - Date et heure (si événement fixe)
   - Lieu
   - Prix

2. **Sélection de la date** (si `requires_agenda = true`) :
   - Intégration Calendly via iframe
   - Ou sélecteur de créneaux personnalisé

3. **Informations complémentaires** :
   - Nombre de participants
   - Notes spéciales
   - Allergies (pour restaurants)

4. **Bouton de confirmation** :
   - "Confirmer ma réservation"
   - "Payer et réserver" (si paiement requis)

---

### 5. Création de la Réservation

**Action** : Soumission du formulaire de réservation

**Cas 1 : Offre incluse dans l'abonnement** (gratuite)

```typescript
const { data: booking, error } = await supabase
  .from('bookings')
  .insert({
    user_id: user.id,
    offer_id: offerId,
    partner_id: offer.partner_id,
    status: 'confirmed',
    booking_date: selectedDate,
    quantity: 1,
    unit_amount_cents: 0,
    total_amount_cents: 0,
    currency: 'EUR',
    notes: userNotes
  })
  .select()
  .single();
```

**Cas 2 : Offre payante** (paiement requis)

```typescript
// 1. Créer la réservation en statut 'pending'
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    user_id: user.id,
    offer_id: offerId,
    partner_id: offer.partner_id,
    status: 'pending',
    booking_date: selectedDate,
    quantity: 1,
    unit_amount_cents: offer.price * 100,
    total_amount_cents: offer.price * 100,
    currency: 'EUR'
  })
  .select()
  .single();

// 2. Créer une session Stripe Checkout
const { data: session } = await supabase.functions.invoke('create-offer-session', {
  body: {
    bookingId: booking.id,
    offerId: offerId,
    amount: offer.price
  }
});

// 3. Rediriger vers Stripe
window.location.href = session.url;
```

---

### 6. Paiement Stripe (si applicable)

**Edge Function** : `supabase/functions/create-offer-session/`

**Actions** :
1. Création d'une session Stripe Checkout
2. Mode `payment` (paiement unique, pas abonnement)
3. Metadata :
   - `booking_id`
   - `offer_id`
   - `user_id`

**Webhook** : `checkout.session.completed`

**Traitement** :
```typescript
// Dans stripe-webhook
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const bookingId = session.metadata.booking_id;
  
  // Mettre à jour la réservation
  await supabase
    .from('bookings')
    .update({
      status: 'paid',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      paid_at: new Date().toISOString()
    })
    .eq('id', bookingId);
  
  // Décrémenter le stock si applicable
  await decrementOfferStock(session.metadata.offer_id);
  
  // Générer le QR code
  await generateBookingQRCode(bookingId);
  
  // Envoyer l'email de confirmation
  await sendBookingConfirmation(bookingId);
}
```

---

### 7. Génération du QR Code

**Fonction** : `generateBookingQRCode()`

**Actions** :
1. Génération d'un code unique
2. Création du QR code (image ou data URL)
3. Stockage dans `bookings.qr_code`

**Code** :
```typescript
import QRCode from 'qrcode';

async function generateBookingQRCode(bookingId: string) {
  // Générer un code unique
  const qrData = `NOWME-${bookingId}-${Date.now()}`;
  
  // Créer le QR code
  const qrCodeUrl = await QRCode.toDataURL(qrData);
  
  // Sauvegarder
  await supabase
    .from('bookings')
    .update({
      qr_code: qrCodeUrl,
      qr_code_data: qrData
    })
    .eq('id', bookingId);
  
  return qrCodeUrl;
}
```

---

### 8. Email de Confirmation

**Edge Function** : `supabase/functions/booking-created/`

**Contenu** :
- Récapitulatif de la réservation
- Date, heure, lieu
- QR code à présenter
- Instructions d'accès
- Contact du partenaire
- Bouton "Ajouter au calendrier"

**Template** :
```html
<h1>🎉 Réservation confirmée !</h1>

<p>Bonjour [prénom],</p>

<p>Ta réservation pour <strong>[titre offre]</strong> est confirmée !</p>

<div class="booking-details">
  <p><strong>📅 Date :</strong> [date]</p>
  <p><strong>🕐 Heure :</strong> [heure]</p>
  <p><strong>📍 Lieu :</strong> [adresse]</p>
</div>

<div class="qr-code">
  <img src="[qr_code_url]" alt="QR Code" />
  <p>Présente ce QR code à ton arrivée</p>
</div>

<a href="[calendar_link]" class="button">Ajouter à mon calendrier</a>

<p>À très vite !<br>L'équipe Nowme</p>
```

---

### 9. Affichage de la Confirmation

**Page** : `/booking/success/:bookingId` ou `/club/bookings/:bookingId`

**Affichage** :
- Message de succès
- Détails de la réservation
- QR code téléchargeable
- Bouton "Ajouter au calendrier"
- Lien vers "Mes réservations"

---

### 10. Gestion des Réservations

**Page** : `/club/bookings` ou `/account/bookings`

**Liste des réservations** :
- Réservations à venir
- Réservations passées
- Réservations annulées

**Statuts possibles** :
- `pending` : En attente de paiement
- `paid` : Payée, en attente de confirmation
- `confirmed` : Confirmée par le partenaire
- `completed` : Événement passé
- `cancelled` : Annulée
- `refunded` : Remboursée

**Actions** :
- Voir le QR code
- Télécharger le QR code
- Annuler la réservation (selon conditions)
- Contacter le partenaire
- Laisser un avis

---

## 🗄️ Tables de la Base de Données

### Table `bookings`

**Schéma complet** :
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  
  -- Détails de la réservation
  booking_date TIMESTAMPTZ,
  booking_time TIME,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded'
  )),
  
  -- Paiement
  unit_amount_cents INTEGER,
  total_amount_cents INTEGER,
  currency TEXT DEFAULT 'EUR',
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  
  -- QR Code
  qr_code TEXT,
  qr_code_data TEXT,
  
  -- Informations complémentaires
  notes TEXT,
  special_requests TEXT,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Index
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_offer_id ON bookings(offer_id);
CREATE INDEX idx_bookings_partner_id ON bookings(partner_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Index uniques pour Stripe
CREATE UNIQUE INDEX uniq_bookings_checkout_session 
  ON bookings(stripe_checkout_session_id);
CREATE UNIQUE INDEX uniq_bookings_payment_intent 
  ON bookings(stripe_payment_intent_id);
```

### Table `offers`

**Colonnes pertinentes** :
```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  
  -- Localisation
  location TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  
  -- Disponibilité
  requires_agenda BOOLEAN DEFAULT false,
  calendly_url TEXT,
  has_stock BOOLEAN DEFAULT false,
  stock INTEGER,
  
  -- Statut
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending', 'approved', 'rejected', 'active', 'inactive'
  )),
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table `offer_prices`

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

---

## 🔐 Sécurité (RLS)

### Policies `bookings`

```sql
-- Les utilisateurs peuvent voir leurs propres réservations
CREATE POLICY "bookings_select_own"
  ON bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Les partenaires peuvent voir les réservations de leurs offres
CREATE POLICY "bookings_select_partner"
  ON bookings FOR SELECT TO authenticated
  USING (partner_id IN (
    SELECT p.id FROM partners p WHERE p.user_id = auth.uid()
  ));

-- Les utilisateurs peuvent créer leurs propres réservations
CREATE POLICY "bookings_insert_own"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leurs propres réservations
CREATE POLICY "bookings_update_own"
  ON bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Service role a tous les droits
CREATE POLICY "bookings_service_role"
  ON bookings AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 🔄 Triggers et Fonctions

### Trigger : Calcul automatique du total

```sql
CREATE OR REPLACE FUNCTION bookings_fill_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Currency par défaut
  IF NEW.currency IS NULL THEN
    NEW.currency := 'EUR';
  END IF;

  -- Total = unit * quantity si absent/0
  IF (NEW.total_amount_cents IS NULL OR NEW.total_amount_cents = 0)
     AND NEW.unit_amount_cents IS NOT NULL
     AND NEW.quantity IS NOT NULL THEN
    NEW.total_amount_cents := NEW.unit_amount_cents * NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_fill_defaults_biu
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION bookings_fill_defaults();
```

### Trigger : Mise à jour du stock

```sql
CREATE OR REPLACE FUNCTION decrement_offer_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la réservation passe à 'paid' ou 'confirmed'
  IF NEW.status IN ('paid', 'confirmed') AND OLD.status = 'pending' THEN
    UPDATE offers
    SET stock = stock - NEW.quantity
    WHERE id = NEW.offer_id AND has_stock = true;
  END IF;
  
  -- Si annulation, remettre le stock
  IF NEW.status = 'cancelled' AND OLD.status IN ('paid', 'confirmed') THEN
    UPDATE offers
    SET stock = stock + NEW.quantity
    WHERE id = NEW.offer_id AND has_stock = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_stock_management
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION decrement_offer_stock();
```

---

## ⚠️ Points d'Attention / Problèmes Actuels

### 🔴 Problèmes identifiés

1. **Gestion du stock**
   - Race condition possible si plusieurs réservations simultanées
   - Pas de verrouillage optimiste
   - Stock peut devenir négatif

2. **QR Code**
   - Pas de validation de l'unicité
   - Pas de système anti-fraude
   - Pas d'expiration

3. **Annulation**
   - Pas de politique d'annulation claire
   - Pas de remboursement automatique
   - Pas de délai minimum

4. **Calendly**
   - Intégration manuelle
   - Pas de synchronisation automatique
   - Risque de double réservation

### ✅ Solutions recommandées

1. **Gestion du stock atomique**
   ```sql
   UPDATE offers
   SET stock = stock - 1
   WHERE id = :offer_id 
     AND has_stock = true 
     AND stock > 0
   RETURNING stock;
   ```

2. **QR Code sécurisé**
   - Signature cryptographique
   - Expiration après l'événement
   - Validation côté partenaire

3. **Politique d'annulation**
   - Définir des règles claires
   - Automatiser les remboursements
   - Pénalités selon le délai

4. **Webhook Calendly**
   - Synchronisation bidirectionnelle
   - Mise à jour automatique du stock
   - Confirmation instantanée

---

## 🧪 Tests Recommandés

1. ✅ Réservation offre gratuite
2. ✅ Réservation offre payante
3. ✅ Paiement réussi
4. ✅ Paiement échoué
5. ✅ Génération QR code
6. ✅ Email de confirmation envoyé
7. ✅ Stock décrémenté
8. ✅ Stock à zéro → bouton désactivé
9. ✅ Annulation de réservation
10. ✅ Remboursement
11. ✅ Intégration Calendly
12. ✅ Affichage dans "Mes réservations"

---

## 📊 Diagramme de Séquence

```
Membre          Frontend         Function         Stripe         Database        Partner
  |                |                 |               |               |              |
  |-- Browse ------>|                 |               |               |              |
  |   offers       |                 |               |               |              |
  |                |                 |               |               |              |
  |-- View offer ->|                 |               |               |              |
  |                |-- SELECT ------->               |               |              |
  |                |                 |               |        offers |              |
  |                |                 |               |               |              |
  |-- Clic Réserver|                 |               |               |              |
  |                |                 |               |               |              |
  |-- Formulaire ->|                 |               |               |              |
  |                |                 |               |               |              |
  |-- Confirmer -->|                 |               |               |              |
  |                |-- INSERT ------->               |               |              |
  |                |   booking       |               |      bookings |              |
  |                |   (pending)     |               |               |              |
  |                |                 |               |               |              |
  |                |-- create-offer-session -------->|               |              |
  |                |                 |               |               |              |
  |                |<-- Redirect ----|               |               |              |
  |                |   Stripe        |               |               |              |
  |                |                 |               |               |              |
  |-- Paie -------------------------------->|        |               |              |
  |                |                 |               |               |              |
  |                |                 |<-- webhook ---|               |              |
  |                |                 |   completed   |               |              |
  |                |                 |               |               |              |
  |                |                 |-- UPDATE ----->               |              |
  |                |                 |   status='paid'      bookings |              |
  |                |                 |               |               |              |
  |                |                 |-- UPDATE ----->               |              |
  |                |                 |   stock-1     |        offers |              |
  |                |                 |               |               |              |
  |                |                 |-- generate QR ->              |              |
  |                |                 |               |               |              |
  |<-- Email confirmation ----------|               |               |              |
  |   + QR code    |                 |               |               |              |
  |                |                 |               |               |              |
  |                |                 |-- notify partner ------------->              |
  |                |                 |               |               |-- Email ---->|
  |                |                 |               |               |   "Nouvelle  |
  |                |                 |               |               |   réservation|
```

---

## 🔗 Fichiers Concernés

### Frontend
- `src/pages/Booking.tsx`
- `src/pages/OfferPage.tsx`
- `src/pages/TousLesKiffs.tsx`
- `src/pages/club/Bookings.tsx`

### Backend (Edge Functions)
- `supabase/functions/create-offer-session/`
- `supabase/functions/stripe-webhook/`
- `supabase/functions/booking-created/`
- `supabase/functions/send-emails/`

### Database
- Table `bookings`
- Table `offers`
- Table `offer_prices`
- Triggers sur `bookings`

---

**Dernière mise à jour** : Novembre 2024
