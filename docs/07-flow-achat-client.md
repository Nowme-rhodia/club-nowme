# Flow 7 : Achat Client (Customer Purchase)

## 📋 Vue d'ensemble

Ce flow gère l'achat d'une offre payante par un client, incluant le paiement, la confirmation et la génération du QR code de validation.

## 🎯 Objectif

Permettre aux membres de Nowme Club d'acheter des offres payantes (en plus de leur abonnement) et de recevoir une confirmation avec QR code.

## 🔄 Étapes du Flow

### 1. Types d'Offres et Tarification

**Catégories d'offres** :

1. **Offres incluses** (gratuites pour les membres)
   - Événements du club
   - Masterclasses
   - Certaines réductions partenaires

2. **Offres payantes** (paiement supplémentaire)
   - Séjours et voyages
   - Consultations premium
   - Expériences exclusives
   - Produits physiques (box, etc.)

3. **Offres avec réduction membre**
   - Prix public : 100€
   - Prix membre : 70€
   - Économie : 30€

---

### 2. Consultation de l'Offre

**Page** : `/offer/:id` (`src/pages/OfferPage.tsx`)

**Affichage du prix** :
```typescript
const mainPrice = offer?.offer_prices?.[0];
const discount = mainPrice?.promo_price && mainPrice?.price
  ? Math.round(((mainPrice.price - mainPrice.promo_price) / mainPrice.price) * 100)
  : 0;
```

**Affichage** :
- Prix normal (barré si promo)
- Prix membre (en gros)
- Badge de réduction (ex: "-30%")
- Mention "Réservé aux membres" ou "Paiement supplémentaire"

---

### 3. Vérification du Statut Membre

**Prérequis** :
- ✅ Utilisateur connecté
- ✅ Abonnement actif (`subscription_status = 'active'`)

**Vérification** :
```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('subscription_status, subscription_type')
  .eq('user_id', user.id)
  .single();

if (profile.subscription_status !== 'active') {
  // Rediriger vers /subscription
  toast.error('Un abonnement actif est requis');
  navigate('/subscription');
  return;
}
```

---

### 4. Clic sur "Acheter" / "Réserver"

**Bouton** : Selon le type d'offre

**Cas 1 : Offre gratuite (incluse)**
```typescript
// Création directe de la réservation
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    user_id: user.id,
    offer_id: offerId,
    partner_id: offer.partner_id,
    status: 'confirmed',
    unit_amount_cents: 0,
    total_amount_cents: 0,
    currency: 'EUR'
  })
  .select()
  .single();

// Générer QR code
await generateQRCode(booking.id);

// Rediriger vers confirmation
navigate(`/booking/success/${booking.id}`);
```

**Cas 2 : Offre payante**
```typescript
// Créer la réservation en statut 'pending'
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    user_id: user.id,
    offer_id: offerId,
    partner_id: offer.partner_id,
    status: 'pending',
    unit_amount_cents: offer.price * 100,
    total_amount_cents: offer.price * 100,
    currency: 'EUR'
  })
  .select()
  .single();

// Créer une session Stripe Checkout
const { data: session } = await supabase.functions.invoke('create-offer-session', {
  body: {
    bookingId: booking.id,
    offerId: offerId,
    userId: user.id,
    amount: offer.price
  }
});

// Rediriger vers Stripe
window.location.href = session.url;
```

---

### 5. Création de la Session Stripe

**Edge Function** : `supabase/functions/create-offer-session/`

**Code** :
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const { bookingId, offerId, userId, amount } = await req.json();

  // Récupérer les infos de l'offre
  const { data: offer } = await supabase
    .from('offers')
    .select('title, partner_id')
    .eq('id', offerId)
    .single();

  // Récupérer le customer Stripe de l'utilisateur
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id, email')
    .eq('user_id', userId)
    .single();

  // Créer la session Stripe
  const session = await stripe.checkout.sessions.create({
    customer: profile.stripe_customer_id,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: offer.title,
            description: 'Offre Nowme Club',
          },
          unit_amount: amount * 100, // En centimes
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      offer_id: offerId,
      user_id: userId,
      partner_id: offer.partner_id,
      type: 'offer_purchase'
    },
    success_url: `${Deno.env.get('APP_URL')}/booking/success/${bookingId}`,
    cancel_url: `${Deno.env.get('APP_URL')}/offer/${offerId}`,
  });

  return new Response(
    JSON.stringify({ url: session.url }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

### 6. Paiement Stripe

**Plateforme** : Stripe Checkout

**Processus** :
1. L'utilisateur entre ses informations de paiement (ou utilise une carte enregistrée)
2. Stripe traite le paiement
3. Stripe envoie un webhook `checkout.session.completed`

---

### 7. Traitement du Webhook Stripe

**Edge Function** : `supabase/functions/stripe-webhook/`

**Événement** : `checkout.session.completed`

**Code** :
```typescript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  
  // Vérifier que c'est un achat d'offre
  if (session.metadata.type !== 'offer_purchase') {
    return; // Géré par un autre flow
  }

  const bookingId = session.metadata.booking_id;
  const offerId = session.metadata.offer_id;
  const partnerId = session.metadata.partner_id;

  // 1. Mettre à jour la réservation
  await supabase
    .from('bookings')
    .update({
      status: 'paid',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      paid_at: new Date().toISOString()
    })
    .eq('id', bookingId);

  // 2. Décrémenter le stock si applicable
  await supabase.rpc('decrement_offer_stock', {
    p_offer_id: offerId,
    p_quantity: 1
  });

  // 3. Générer le QR code
  await generateBookingQRCode(bookingId);

  // 4. Créer l'entrée dans customer_orders
  await supabase
    .from('customer_orders')
    .insert({
      user_id: session.metadata.user_id,
      partner_id: partnerId,
      booking_id: bookingId,
      total_amount_cents: session.amount_total,
      currency: session.currency,
      stripe_payment_intent_id: session.payment_intent,
      status: 'completed'
    });

  // 5. Envoyer l'email de confirmation
  await supabase.functions.invoke('booking-created', {
    body: { bookingId }
  });

  // 6. Notifier le partenaire
  await supabase.functions.invoke('send-partner-notification', {
    body: {
      partnerId,
      bookingId,
      type: 'new_booking'
    }
  });
}
```

---

### 8. Génération du QR Code

**Fonction** : `generateBookingQRCode()`

**Code** :
```typescript
import QRCode from 'qrcode';

async function generateBookingQRCode(bookingId: string) {
  // Générer un code unique et sécurisé
  const qrData = JSON.stringify({
    type: 'NOWME_BOOKING',
    id: bookingId,
    timestamp: Date.now(),
    signature: await generateSignature(bookingId)
  });
  
  // Créer le QR code en base64
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 512,
    margin: 2
  });
  
  // Sauvegarder dans la base
  await supabase
    .from('bookings')
    .update({
      qr_code: qrCodeDataUrl,
      qr_code_data: qrData
    })
    .eq('id', bookingId);
  
  return qrCodeDataUrl;
}

// Signature pour éviter la fraude
async function generateSignature(bookingId: string) {
  const secret = Deno.env.get('QR_CODE_SECRET');
  const encoder = new TextEncoder();
  const data = encoder.encode(`${bookingId}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

### 9. Email de Confirmation

**Edge Function** : `supabase/functions/booking-created/`

**Template** :
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E4D44C 0%, #F7A8A8 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; background: white; }
    .qr-code { text-align: center; margin: 30px 0; }
    .qr-code img { width: 300px; height: 300px; }
    .details { background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .button { display: inline-block; padding: 15px 30px; background: #E4D44C; color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Achat confirmé !</h1>
    </div>
    
    <div class="content">
      <p>Bonjour <strong>[prénom]</strong>,</p>
      
      <p>Ton achat pour <strong>[titre offre]</strong> est confirmé !</p>
      
      <div class="details">
        <h3>📋 Détails de ta réservation</h3>
        <p><strong>Offre :</strong> [titre]</p>
        <p><strong>Partenaire :</strong> [nom partenaire]</p>
        <p><strong>📍 Lieu :</strong> [adresse]</p>
        <p><strong>📅 Date :</strong> [date]</p>
        <p><strong>🕐 Heure :</strong> [heure]</p>
        <p><strong>💰 Montant payé :</strong> [prix]€</p>
      </div>
      
      <div class="qr-code">
        <h3>Ton QR Code</h3>
        <img src="[qr_code_url]" alt="QR Code" />
        <p>Présente ce QR code à ton arrivée</p>
      </div>
      
      <a href="[calendar_link]" class="button">📅 Ajouter à mon calendrier</a>
      
      <p><strong>Informations importantes :</strong></p>
      <ul>
        <li>Arrive 10 minutes avant l'heure prévue</li>
        <li>Présente ton QR code au partenaire</li>
        <li>En cas d'empêchement, contacte-nous au moins 24h avant</li>
      </ul>
      
      <p>Besoin d'aide ? Réponds à cet email ou contacte-nous.</p>
      
      <p>À très vite !<br><strong>L'équipe Nowme</strong></p>
    </div>
  </div>
</body>
</html>
```

---

### 10. Enregistrement dans customer_orders

**Table** : `customer_orders`

**Schéma** :
```sql
CREATE TABLE customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Montants
  total_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Paiement Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Statut
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'refunded', 'cancelled'
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- Index
CREATE INDEX idx_customer_orders_user_id ON customer_orders(user_id);
CREATE INDEX idx_customer_orders_partner_id ON customer_orders(partner_id);
CREATE INDEX idx_customer_orders_booking_id ON customer_orders(booking_id);
CREATE INDEX idx_customer_orders_status ON customer_orders(status);
```

**Insertion** :
```sql
INSERT INTO customer_orders (
  user_id,
  partner_id,
  booking_id,
  total_amount_cents,
  currency,
  stripe_payment_intent_id,
  status,
  completed_at
) VALUES (
  :user_id,
  :partner_id,
  :booking_id,
  :total_amount_cents,
  'EUR',
  :payment_intent_id,
  'completed',
  now()
);
```

---

### 11. Notification Partenaire

**Edge Function** : `supabase/functions/send-partner-notification/`

**Email au partenaire** :
```
Nouvelle réservation

Bonjour [nom partenaire],

Tu as une nouvelle réservation !

Client : [prénom nom]
Offre : [titre]
Date : [date]
Heure : [heure]
Montant : [prix]€

Voir la réservation : https://app.nowme.fr/partner/bookings/[booking_id]

L'équipe Nowme
```

---

### 12. Page de Confirmation

**Page** : `/booking/success/:bookingId`

**Affichage** :
- ✅ Message de succès
- 📋 Récapitulatif de la réservation
- 🎫 QR code (affichage + téléchargement)
- 📅 Bouton "Ajouter au calendrier"
- 📧 "Un email de confirmation t'a été envoyé"
- 🔗 Lien vers "Mes réservations"

**Code** :
```typescript
const { data: booking } = await supabase
  .from('bookings')
  .select(`
    *,
    offers(title, description, location),
    partners(business_name, phone, email)
  `)
  .eq('id', bookingId)
  .single();
```

---

### 13. Gestion dans "Mes Achats"

**Page** : `/account/orders` ou `/club/bookings`

**Liste des achats** :
- Achats récents
- Achats passés
- Achats annulés/remboursés

**Informations affichées** :
- Titre de l'offre
- Partenaire
- Date et heure
- Montant payé
- Statut
- QR code
- Actions (voir détails, annuler, contacter)

---

## 🗄️ Tables de la Base de Données

### Table `customer_orders`

Voir schéma ci-dessus (section 10)

### Table `bookings`

Voir Flow 4 - Réservation d'Événement

### Relation entre les tables

```
customer_orders
  ├── user_id → user_profiles
  ├── partner_id → partners
  └── booking_id → bookings
        ├── offer_id → offers
        └── user_id → user_profiles
```

---

## 🔐 Sécurité (RLS)

### Policies `customer_orders`

```sql
-- Les utilisateurs peuvent voir leurs propres commandes
CREATE POLICY "customer_orders_select_own"
  ON customer_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres commandes
CREATE POLICY "customer_orders_insert_own"
  ON customer_orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role a tous les droits
CREATE POLICY "customer_orders_service_role"
  ON customer_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 🔄 Triggers et Fonctions

### Fonction : Décrémentation du stock

```sql
CREATE OR REPLACE FUNCTION decrement_offer_stock(
  p_offer_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  UPDATE offers
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_offer_id AND has_stock = true;
END;
$$ LANGUAGE plpgsql;
```

### Trigger : Mise à jour automatique

```sql
CREATE OR REPLACE FUNCTION update_customer_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := now();
  END IF;
  
  IF NEW.status = 'refunded' AND OLD.status != 'refunded' THEN
    NEW.refunded_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_order_updated_at
  BEFORE UPDATE ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_timestamp();
```

---

## ⚠️ Points d'Attention / Problèmes Actuels

### 🔴 Problèmes identifiés

1. **Double paiement possible**
   - Si l'utilisateur clique plusieurs fois
   - Pas de vérification de commande existante

2. **Gestion des remboursements**
   - Pas de processus automatique
   - Pas de politique claire

3. **QR Code sécurité**
   - Risque de copie/partage
   - Pas d'expiration
   - Pas de validation côté partenaire

4. **Stock négatif**
   - Race condition possible
   - Pas de verrouillage optimiste

### ✅ Solutions recommandées

1. **Idempotence**
   - Vérifier si une commande existe déjà
   - Utiliser un identifiant unique de session
   - Désactiver le bouton après clic

2. **Politique de remboursement**
   - Définir des règles claires
   - Automatiser selon le délai
   - Interface admin pour gérer

3. **QR Code sécurisé**
   - Signature cryptographique
   - Expiration après utilisation
   - Validation en temps réel

4. **Gestion du stock atomique**
   - Transaction avec verrouillage
   - Vérifier avant de créer la commande
   - Rollback si stock insuffisant

---

## 🧪 Tests Recommandés

1. ✅ Achat offre payante
2. ✅ Paiement réussi
3. ✅ Paiement échoué
4. ✅ Webhook traité correctement
5. ✅ QR code généré
6. ✅ Email de confirmation envoyé
7. ✅ Notification partenaire envoyée
8. ✅ Stock décrémenté
9. ✅ Entrée dans customer_orders créée
10. ✅ Affichage dans "Mes achats"
11. ✅ Téléchargement QR code
12. ✅ Ajout au calendrier

---

## 📊 Diagramme de Séquence

```
Client         Frontend        Function         Stripe        Database       Partenaire
  |               |                |               |              |               |
  |-- Voir offre->|                |               |              |               |
  |               |-- SELECT ------>               |       offers |               |
  |               |                |               |              |               |
  |-- Acheter --->|                |               |              |               |
  |               |-- INSERT ------>               |     bookings |               |
  |               |   (pending)    |               |              |               |
  |               |                |               |              |               |
  |               |-- create-offer-session ------->|              |               |
  |               |                |               |              |               |
  |               |<-- Redirect ---|               |              |               |
  |               |   Stripe       |               |              |               |
  |               |                |               |              |               |
  |-- Paie ------------------------------>|        |              |               |
  |               |                |               |              |               |
  |               |                |<-- webhook ---|              |               |
  |               |                |   completed   |              |               |
  |               |                |               |              |               |
  |               |                |-- UPDATE ----->              |               |
  |               |                |   status='paid'     bookings |               |
  |               |                |               |              |               |
  |               |                |-- INSERT ----->              |               |
  |               |                |               | customer_orders              |
  |               |                |               |              |               |
  |               |                |-- UPDATE ----->              |               |
  |               |                |   stock-1     |       offers |               |
  |               |                |               |              |               |
  |               |                |-- generate QR ->             |               |
  |               |                |               |              |               |
  |<-- Email confirmation ---------|               |              |               |
  |   + QR code   |                |               |              |               |
  |               |                |               |              |               |
  |               |                |-- notify-partner ------------>               |
  |               |                |               |              |-- Email ----->|
  |               |                |               |              |   "Nouvelle   |
  |               |                |               |              |   réservation"|
  |               |                |               |              |               |
  |               |<-- Redirect ---|               |              |               |
  |               |   /success     |               |              |               |
```

---

## 🔗 Fichiers Concernés

### Frontend
- `src/pages/OfferPage.tsx`
- `src/pages/Booking.tsx`
- `src/pages/club/Orders.tsx`

### Backend (Edge Functions)
- `supabase/functions/create-offer-session/`
- `supabase/functions/stripe-webhook/`
- `supabase/functions/booking-created/`
- `supabase/functions/send-partner-notification/`

### Database
- Table `customer_orders`
- Table `bookings`
- Table `offers`
- Triggers et fonctions

---

**Dernière mise à jour** : Novembre 2024
