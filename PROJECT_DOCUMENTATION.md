# 🌸 Nowme Club - Documentation Complète

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du projet](#architecture-du-projet)
3. [Stack technique](#stack-technique)
4. [Structure des dossiers](#structure-des-dossiers)
5. [Fonctionnalités principales](#fonctionnalités-principales)
6. [Configuration locale](#configuration-locale)
7. [Lancement du projet](#lancement-du-projet)
8. [Base de données et migrations](#base-de-données-et-migrations)
9. [Intégrations tierces](#intégrations-tierces)
10. [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

**Nowme Club** est une plateforme web premium de découverte d'expériences destinée aux femmes. Elle permet aux abonnées d'accéder à des offres exclusives, événements, masterclasses et consultations wellness proposés par des partenaires validés.

### Concept
- **Pour les abonnées** : Accès illimité à des expériences premium (restaurants, spas, événements) avec un abonnement mensuel ou annuel
- **Pour les partenaires** : Visibilité auprès d'une communauté ciblée et gestion des réservations
- **Pour les admins** : Gestion complète de la plateforme, validation des partenaires et offres

### Modèle économique
- Abonnement mensuel : 39,99€/mois
- Abonnement annuel : 399€/an
- Offre découverte : 12,99€
- Paiements gérés via Stripe

---

## 🏗️ Architecture du projet

### Type d'application
- **Frontend** : Single Page Application (SPA) React avec TypeScript
- **Backend** : Supabase (PostgreSQL + Edge Functions)
- **Paiements** : Stripe (checkout + webhooks)
- **Déploiement** : Netlify (frontend) + Supabase (backend)

### Flux d'authentification
```
User → Supabase Auth → JWT Token → Protected Routes
                    ↓
              User Profiles Table
                    ↓
         Role Detection (admin/partner/subscriber)
```

### Flux de paiement
```
User → Stripe Checkout → Webhook → Supabase Edge Function → Database Update
```

---

## 🛠️ Stack technique

### Frontend
- **Framework** : React 18.2.0
- **Langage** : TypeScript 5.3.3
- **Build Tool** : Vite 5.0.12
- **Routing** : React Router DOM 6.22.0
- **Styling** : TailwindCSS 3.4.1
- **Animations** : Framer Motion 11.18.2
- **Icons** : Lucide React 0.330.0
- **Forms** : React Hook Form 7.61.1
- **Notifications** : React Hot Toast 2.5.1
- **SEO** : React Helmet Async 2.0.5

### Backend & Services
- **Database** : Supabase (PostgreSQL 15)
- **Auth** : Supabase Auth
- **Edge Functions** : Deno (Supabase Functions)
- **Paiements** : Stripe (API + Webhooks)
- **Emails** : Resend API
- **Maps** : Google Maps API

### Dev Tools
- **Linter** : ESLint 8.56.0
- **Package Manager** : npm
- **Version Control** : Git + GitHub
- **CI/CD** : GitHub Actions

---

## 📁 Structure des dossiers

```
club-nowme/
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       └── supabase.yml       # CI/CD pour Supabase
├── public/                     # Assets statiques
├── scripts/                    # Scripts utilitaires
│   ├── db-migrate.js          # Gestion des migrations
│   ├── test-stripe-flow.js    # Tests Stripe
│   └── ...
├── src/                        # Code source React
│   ├── components/            # Composants réutilisables
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── ...
│   ├── pages/                 # Pages de l'application
│   │   ├── Home.tsx
│   │   ├── Subscription.tsx
│   │   ├── admin/            # Pages admin
│   │   ├── partner/          # Pages partenaire
│   │   ├── club/             # Pages club membre
│   │   └── auth/             # Pages authentification
│   ├── lib/                   # Bibliothèques et utilitaires
│   │   ├── supabase.ts       # Client Supabase
│   │   ├── auth.tsx          # Context d'authentification
│   │   ├── stripe.ts         # Intégration Stripe
│   │   └── ...
│   ├── types/                 # Types TypeScript
│   ├── hooks/                 # Custom React hooks
│   ├── data/                  # Données statiques
│   ├── utils/                 # Fonctions utilitaires
│   ├── App.tsx               # Composant principal
│   ├── main.tsx              # Point d'entrée
│   └── index.css             # Styles globaux
├── supabase/                  # Configuration Supabase
│   ├── config.toml           # Configuration projet
│   ├── functions/            # Edge Functions (Deno)
│   │   ├── stripe-webhook/
│   │   ├── create-checkout-session/
│   │   ├── send-emails/
│   │   └── ...
│   └── migrations/           # Migrations SQL
│       ├── 20250805132613_shiny_trail.sql
│       └── ...
├── .env.example              # Template variables d'environnement
├── package.json              # Dépendances npm
├── vite.config.ts           # Configuration Vite
├── tailwind.config.js       # Configuration Tailwind
├── tsconfig.json            # Configuration TypeScript
├── netlify.toml             # Configuration Netlify
└── README.md                # Documentation
```

---

## ⚡ Fonctionnalités principales

### 1. Authentification & Autorisation
- **Inscription/Connexion** : Email + mot de passe via Supabase Auth
- **Réinitialisation mot de passe** : Email avec lien de réinitialisation
- **Rôles** : 
  - `guest` : Visiteur non connecté
  - `subscriber` : Abonné actif
  - `partner` : Partenaire avec offres
  - `admin` : Administrateur plateforme

### 2. Espace Abonné
- **Dashboard** : Vue d'ensemble des offres disponibles
- **Catalogue d'offres** : Filtrage par catégorie, région, ville
- **Détail offre** : Informations complètes + réservation
- **QR Code** : Code unique pour validation en magasin
- **Club exclusif** : Événements, masterclasses, wellness
- **Profil** : Gestion abonnement, historique

### 3. Espace Partenaire
- **Dashboard** : Statistiques et réservations
- **Gestion des offres** : Création, modification, suppression
- **Réservations** : Suivi et validation des bookings
- **Paiements** : Configuration Stripe Connect
- **Paramètres** : Informations entreprise, horaires

### 4. Espace Admin
- **Gestion partenaires** : Validation, approbation, rejet
- **Gestion offres** : Modération des offres soumises
- **Abonnés** : Liste et gestion des utilisateurs
- **Newsletter** : Envoi d'emails groupés
- **Réservations** : Vue globale des bookings
- **Payouts** : Gestion des paiements partenaires

### 5. Système de paiement (Stripe)
- **Checkout** : Sessions de paiement sécurisées
- **Webhooks** : Synchronisation automatique des statuts
- **Abonnements** : Gestion récurrente mensuelle/annuelle
- **Paiements one-time** : Pour réservations spécifiques
- **Remboursements** : Gestion des refunds

### 6. Système de réservation
- **Booking** : Réservation d'offres avec paiement
- **Validation** : QR Code scannable par partenaire
- **Statuts** : pending → paid → confirmed → completed
- **Notifications** : Emails automatiques

---

## ⚙️ Configuration locale

### Prérequis
- **Node.js** : Version 20.x ou supérieure
- **npm** : Version 9.x ou supérieure
- **Compte Supabase** : Projet créé sur supabase.com
- **Compte Stripe** : Clés API test
- **Compte Resend** : Pour l'envoi d'emails (optionnel)
- **Google Maps API** : Pour la géolocalisation (optionnel)

### 1. Cloner le repository
```bash
git clone <repository-url>
cd club-nowme
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet en copiant `.env.example` :

```bash
cp .env.example .env
```

Remplir les variables :

```env
# Configuration Supabase
VITE_SUPABASE_URL=https://dqfyuhwrjozoxadkccdj.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Configuration Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs Stripe
STRIPE_PRICE_ID_MONTHLY=price_1RqraiDaQ8XsywAvAAmxoAFW
STRIPE_PRICE_ID_YEARLY=price_1Rqrb6DaQ8XsywAvvF8fsaJi

# Configuration Email (Resend)
RESEND_API_KEY=re_...

# Configuration Google Maps (optionnel)
VITE_GOOGLE_MAPS_API_KEY=votre_google_maps_key
```

#### Où trouver les clés ?

**Supabase** :
1. Aller sur [supabase.com](https://supabase.com)
2. Sélectionner votre projet
3. Settings → API
4. Copier `URL`, `anon public` et `service_role` (secret)

**Stripe** :
1. Aller sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Developers → API keys
3. Copier les clés de test (pk_test_... et sk_test_...)
4. Pour le webhook secret : Developers → Webhooks → Add endpoint

**Resend** :
1. Aller sur [resend.com](https://resend.com)
2. API Keys → Create API Key

**Google Maps** :
1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Create credentials → API key

---

## 🚀 Lancement du projet

### Mode développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Build production

```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/`

### Preview du build

```bash
npm run preview
```

### Scripts disponibles

```bash
# Développement
npm run dev              # Lance le serveur de développement
npm run start            # Alias pour npm run dev

# Build
npm run build            # Compile pour la production
npm run preview          # Preview du build de production

# Linting
npm run lint             # Vérifie le code avec ESLint

# Base de données
npm run db:migrate       # Applique les migrations
npm run db:create        # Crée une nouvelle migration
npm run db:push          # Push les migrations vers Supabase
npm run db:list          # Liste les migrations
npm run db:reset         # Reset la base de données

# Tests
npm run test:connection  # Test la connexion Supabase
npm run test:stripe      # Test le flow Stripe
npm run test:complete-flow # Test complet du flow

# Stripe (nécessite Stripe CLI)
npm run stripe:listen    # Écoute les webhooks Stripe
npm run stripe:test      # Déclenche un événement test

# Webhooks
npm run webhook:test     # Test les webhooks
npm run webhook:cleanup  # Nettoie les webhooks
npm run webhook:debug    # Debug les webhooks
npm run webhook:watch    # Watch les webhooks
```

---

## 🗄️ Base de données et migrations

### Structure de la base de données

#### Tables principales

**`user_profiles`**
- Profils utilisateurs avec abonnements
- Colonnes : `user_id`, `email`, `subscription_status`, `subscription_type`, `stripe_customer_id`

**`partners`**
- Partenaires de la plateforme
- Colonnes : `id`, `user_id`, `company_name`, `is_active`, `stripe_account_id`

**`offers`**
- Offres proposées par les partenaires
- Colonnes : `id`, `partner_id`, `title`, `description`, `category`, `price`, `status`

**`bookings`**
- Réservations des abonnés
- Colonnes : `id`, `user_id`, `offer_id`, `status`, `stripe_payment_intent_id`, `qr_code`

**`subscriptions`**
- Abonnements Stripe
- Colonnes : `user_id`, `stripe_subscription_id`, `status`, `current_period_end`

**`stripe_webhook_events`**
- Log des événements Stripe
- Colonnes : `stripe_event_id`, `event_type`, `status`, `raw_event`

### Gestion des migrations

#### Créer une nouvelle migration

```bash
npm run db:create nom_de_la_migration
```

Cela crée un fichier dans `supabase/migrations/` avec un timestamp.

#### Appliquer les migrations

```bash
npm run db:migrate
```

#### Lister les migrations

```bash
npm run db:list
```

#### Reset la base de données (⚠️ DANGER)

```bash
npm run db:reset
```

### Exemple de migration

```sql
-- Créer une table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer un index
CREATE INDEX idx_offers_partner_id ON offers(partner_id);
CREATE INDEX idx_offers_status ON offers(status);

-- Activer RLS (Row Level Security)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Politique RLS : les partenaires voient leurs offres
CREATE POLICY "Partners can view their own offers"
  ON offers FOR SELECT
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));
```

---

## 🔌 Intégrations tierces

### Supabase

**Configuration** : `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
```

**Edge Functions** : Déployées dans `supabase/functions/`
- Langage : Deno (TypeScript)
- Déploiement : Automatique via GitHub Actions
- Endpoint : `https://[project-id].supabase.co/functions/v1/[function-name]`

### Stripe

**Configuration** : `src/lib/stripe.ts`

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);
```

**Webhooks** : `supabase/functions/stripe-webhook/index.ts`

Événements gérés :
- `checkout.session.completed` : Création abonnement/booking
- `payment_intent.succeeded` : Paiement réussi
- `invoice.payment_succeeded` : Abonnement actif
- `customer.subscription.deleted` : Annulation abonnement
- `charge.refunded` : Remboursement

**Configuration webhook Stripe** :
1. Dashboard Stripe → Developers → Webhooks
2. Add endpoint : `https://[project-id].supabase.co/functions/v1/stripe-webhook`
3. Sélectionner les événements ci-dessus
4. Copier le signing secret dans `.env`

### Resend (Emails)

**Configuration** : Edge Functions utilisent l'API Resend

```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'Nowme <hello@nowme.fr>',
    to: email,
    subject: 'Bienvenue chez Nowme',
    html: emailTemplate
  })
});
```

### Google Maps

**Configuration** : `src/components/LocationSearch.tsx`

```typescript
import { useLoadScript } from '@react-google-maps/api';

const { isLoaded } = useLoadScript({
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  libraries: ['places']
});
```

---

## 🚢 Déploiement

### Frontend (Netlify)

**Configuration** : `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Déploiement** :
1. Connecter le repository GitHub à Netlify
2. Configurer les variables d'environnement dans Netlify UI
3. Déploiement automatique à chaque push sur `main`

**Variables d'environnement Netlify** :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`

### Backend (Supabase)

**CI/CD** : `.github/workflows/supabase.yml`

Le workflow GitHub Actions :
1. Vérifie la configuration Supabase
2. Applique les migrations SQL
3. Déploie les Edge Functions

**Déploiement manuel** :
```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link au projet
supabase link --project-ref dqfyuhwrjozoxadkccdj

# Déployer les fonctions
supabase functions deploy

# Appliquer les migrations
supabase db push
```

### Variables d'environnement Supabase

À configurer dans Supabase Dashboard → Settings → Edge Functions → Secrets :

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET_DASHBOARD`
- `STRIPE_WEBHOOK_SECRET_CLI`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🧪 Tests

### Test de connexion Supabase
```bash
npm run test:connection
```

### Test du flow Stripe
```bash
npm run test:stripe
```

### Test complet
```bash
npm run test:complete-flow
```

### Test des webhooks (nécessite Stripe CLI)

1. Installer Stripe CLI :
```bash
# Windows (Scoop)
scoop install stripe

# macOS (Homebrew)
brew install stripe/stripe-cli/stripe
```

2. Login Stripe :
```bash
stripe login
```

3. Écouter les webhooks :
```bash
npm run stripe:listen
```

4. Déclencher un événement test :
```bash
npm run stripe:test
```

---

## 📝 Notes importantes

### Sécurité

1. **Ne jamais commiter les fichiers `.env`** : Ils contiennent des secrets
2. **Row Level Security (RLS)** : Activé sur toutes les tables sensibles
3. **Service Role Key** : Utilisée uniquement côté serveur (Edge Functions)
4. **Stripe Webhook Signature** : Toujours vérifier la signature des webhooks

### Performance

1. **Lazy Loading** : Toutes les pages sont chargées à la demande
2. **Code Splitting** : Vite optimise automatiquement les bundles
3. **Images** : Utiliser des CDN (Unsplash, Cloudinary)
4. **Cache** : Supabase gère le cache des requêtes

### SEO

1. **React Helmet Async** : Gestion des meta tags
2. **Sitemap** : Générer un sitemap.xml pour le référencement
3. **Redirects** : Configurés dans `netlify.toml`

### Maintenance

1. **Logs** : Consulter les logs dans Supabase Dashboard → Logs
2. **Monitoring** : Utiliser Supabase Analytics
3. **Backups** : Supabase fait des backups automatiques
4. **Updates** : Mettre à jour régulièrement les dépendances npm

---

## 🆘 Dépannage

### Erreur : "Supabase env variables manquantes"
→ Vérifier que le fichier `.env` existe et contient les bonnes clés

### Erreur : "Stripe failed to initialize"
→ Vérifier `VITE_STRIPE_PUBLISHABLE_KEY` dans `.env`

### Erreur : "Invalid signature" (webhook)
→ Vérifier `STRIPE_WEBHOOK_SECRET` et que l'endpoint webhook est configuré

### Erreur : "Cannot read properties of undefined"
→ Vérifier que toutes les dépendances sont installées : `npm install`

### Port déjà utilisé
→ Changer le port dans `vite.config.ts` ou tuer le processus :
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

---

## 📞 Support

Pour toute question ou problème :
- **Email** : support@nowme.fr
- **Documentation Supabase** : https://supabase.com/docs
- **Documentation Stripe** : https://stripe.com/docs
- **Documentation React** : https://react.dev

---

## 📄 Licence

Ce projet est propriétaire et confidentiel. Tous droits réservés © 2025 Nowme.

---

**Dernière mise à jour** : Janvier 2025
