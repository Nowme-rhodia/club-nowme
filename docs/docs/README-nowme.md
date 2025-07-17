
# 📝 Documentation de prise en main – `nowme.ts`

## 🎯 Objectif du projet

Ce projet met en place un **serveur webhook Stripe** tournant sur **Deno**, qui :
- Reçoit des événements Stripe (abonnements principalement géré)
- Valide et traite ces événements pour gérer des comptes club nowme
- Met à jour une base de données **Supabase**
- Logge les actions pour faciliter le suivi et le débogage
  
---


##  TODO

Actuellement le projet prend bien compte l'arrivée d'evenement stripe de type souscription. 
Il créé dans la table auth.user et public.user_profiles les comptes et gere bien le statut de souscription. 
Reste a faire : 
  Gerer le mail d'invitation a créer son compte et set son mot de passe. Dans la version actuelle le mail qui est recu donne un lien vers des références locales. Il faut lier la gestion du reset de mot de passe avec une  page dédiée sur un hebergement nowme. ==> J'étais en train de travailler sur cette partie mais toutes les modification faite sur stackblitz ne se repercutaient pas dans le code du club nowme.  
  Tester la connexion et l'acces aux services nowme  une fois le compte créé 

---

##  Info importante 

La derniere version du code est directement déposée dans supabse ICI : https://supabase.com/dashboard/project/eerkksxhwgbwovzurgfx/functions/stripe-webhook/code
C'est bien sur le projet Nowme-Test 
!!!!!!!!! La structure de base de données qui fonctionne avec le code est aussi sur le serveur de test. Si vous voulez tester en PROD il faudra aussi exporter/importer la base de données.

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
