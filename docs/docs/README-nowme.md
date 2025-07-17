
# 📝 Documentation de prise en main – `nowme.ts`

## 🎯 Objectif du projet

Ce projet met en place un **serveur webhook Stripe** tournant sur **Deno**, qui :
- Reçoit des événements Stripe (abonnements)
- Valide et traite ces événements pour gérer des comptes club nowme
- Toute la gestion des comptes dans la BDD supabase est lié aux event de souscription dans stripe
- Met à jour une base de données **Supabase** utilisée pour faire fonctionner le site club Nowme
- Logge les actions pour faciliter le suivi et le débogage
  
---


##  TODO

Actuellement le projet prend bien compte l'arrivée d'evenement stripe de type souscription. 
Il créé dans la table auth.user et public.user_profiles les comptes et gere bien le statut de souscription. 
Reste a faire : 
  **Gerer le mail d'invitation** : Le but est qu'a la reception d'une premiere souscription via stripe un compte supabase est créé. Ce compte va servir pour acceder aux pages et services du club Nowme. 
  Dans la version actuelle le mail s'envoi bien mais les lienl pour reset le mot de passe sont inopérant car ils redirigent vers du localhost. J'étais en train d'essayer de configurer le lien du mail pour qu'il redirige vers une page web hebergée dans le club nowme (ce git). Pour ce faire il faut modifier le code dans staclblitz et le push mais quand je faisait ces manipulation je ne voyait pas de changement sur clubnowme.com.
  Pour moi il faut donc : 
  1) Modifier la fonction de reset password du club nowme pour qu'elle récupere bien le token envoyé par supabase ==> Normalement j'ai déjà fait ce changement dans le code stackblitz mais je n'arrive pas a voir mes modifications quand je test. Je ne connais pas assez l'environement. 
  2) Ajouter une reference au club nowme dans le mail dinvitation géré par subapase.  
  3) Tester la connexion et l'acces aux services nowme  une fois le compte créé 
J'ai utilisé les fonction de service de mail de base proposé par supabase, peut etre faudra t-il géré un serveur de mail propre a Nowme ?
---

##  Info importante 

La derniere version du code est directement déposée dans supabse ICI : https://supabase.com/dashboard/project/eerkksxhwgbwovzurgfx/functions/stripe-webhook/code
C'est bien sur le projet **Nowme-Test** La PROD n'est pas a jour. 
!!!!!!!!! La structure de base de données qui fonctionne avec le code est aussi sur le serveur de test. Si vous voulez tester en PROD il faudra aussi exporter/importer la base de données.
Le projet peut actuellement se run avec supabase/stripe online. Tout est configuré. 

---


## ⚙️ Prérequis

- Environnement Deno (v1.35+ recommandé) : https://deno.land/
- Le projet Supabase
- Un compte Stripe configuré avec un endpoint webhook (déjà confuguré)
- Un compte avec aces a stackblitz pour le déploiement des pages HTML

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
