
# 📝 Documentation de prise en main – `nowme.ts`

## 🎯 Objectif du projet

Ce projet met en place un **serveur webhook Stripe** tournant sur **Deno**, qui :
- Reçoit des événements Stripe (paiements, abonnements, sessions de checkout, etc.)
- Valide et traite ces événements
- Met à jour une base de données **Supabase**
- Logge les actions pour faciliter le suivi et le débogage

---

## ⚙️ Prérequis

- Environnement Deno (v1.35+ recommandé) : https://deno.land/
- Un projet Supabase (avec tables `users`, `subscriptions`, etc.)
- Un compte Stripe configuré avec un endpoint webhook

---

## 🔐 Variables d’environnement nécessaires

À définir avant le démarrage, via un `.env` ou via `Deno.env` selon votre méthode de déploiement :

| Clé                          | Description                                                  |
|-----------------------------|--------------------------------------------------------------|
| `SUPABASE_URL`              | URL de votre instance Supabase                              |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète avec droits en écriture                         |
| `SUPABASE_ANON_KEY`         | Clé publique (pour certaines opérations de lecture)         |
| `STRIPE_SECRET_KEY`         | Clé secrète Stripe                                           |
| `STRIPE_WEBHOOK_SECRET`     | Clé de signature du webhook Stripe                          |

---

## 🏗️ Structure du code

### 1. Initialisation
- Log des variables d’environnement (si disponibles)
- Initialisation du client Supabase
- Création d’un objet `Stripe` pour parser les événements reçus

### 2. Serveur HTTP
- Utilise `serve()` de Deno pour écouter les requêtes HTTP entrantes
- Accepte uniquement les requêtes `POST` (webhook)

### 3. Vérification de la signature Stripe
- Lecture du `rawBody`
- Validation avec `Stripe.webhooks.constructEvent(...)`

### 4. Traitement des événements

| Événement Stripe                 | Action faite dans Supabase                            |
|----------------------------------|--------------------------------------------------------|
| `checkout.session.completed`     | Mise à jour de l'utilisateur avec l'ID Stripe         |
| `customer.subscription.updated`  | Mise à jour des infos d’abonnement                    |
| `invoice.paid`                   | (optionnel) log ou actions liées à la facturation     |

### 5. Logs
- Les actions, erreurs et détails techniques sont loggés en console avec des emojis :
  - 🔵 Log info
  - 🔴 Erreur
  - 🟠 Avertissement

---

## 🚀 Démarrage local (pour test)

```bash
deno run --allow-net --allow-env --unstable nowme.ts
```

> 💡 Pour tester les webhooks localement, utilisez [`stripe-cli`](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:8000
```

---

## 📦 Déploiement

Le projet peut être déployé sur :
- **Deno Deploy**
- **Vercel / Netlify edge function** (avec adaptation)
- Serveur Deno classique

Assurez-vous que les variables d’environnement sont bien configurées sur la plateforme cible.

---

## 🛠️ Points d’attention

- ⚠️ Le fichier suppose certaines structures de données dans Supabase (`users`, `subscriptions`, etc.)
- ⚠️ Pas de gestion d’authentification utilisateur côté client ici : ce backend sert uniquement à synchroniser Stripe ⇄ Supabase
- ✅ La logique est modulaire et bien loggée, facile à étendre
