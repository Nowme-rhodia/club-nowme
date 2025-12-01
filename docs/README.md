# 📚 Documentation des Flows - Nowme Club

## 🎯 Vue d'ensemble

Cette documentation détaille les 7 flows principaux de la plateforme Nowme Club. Chaque flow est analysé en profondeur avec :
- Les étapes détaillées
- Les tables de base de données impliquées (DDL Supabase)
- Les fichiers de code concernés
- Les problèmes actuels et solutions recommandées
- Les diagrammes de séquence
- Les tests recommandés

## 📋 Liste des Flows

### 1. [Inscription Client + Abonnement + Gestion Utilisateur](./01-flow-inscription-abonnement-client.md)

**Résumé** : Processus complet d'inscription d'un nouveau client, choix de l'abonnement (mensuel/annuel), paiement via Stripe, et activation du compte membre.

**Tables principales** :
- `auth.users`
- `user_profiles`
- `subscriptions`
- `pending_signups`
- `stripe_webhook_events`

**Points clés** :
- Création compte auth + profil utilisateur
- Intégration Stripe Checkout pour abonnement
- Webhooks Stripe pour activation
- Email de bienvenue
- Gestion des erreurs et synchronisation

---

### 2. [Candidature Partenaire](./02-flow-candidature-partenaire.md)

**Résumé** : Processus de candidature d'un nouveau partenaire souhaitant proposer ses offres sur la plateforme.

**Tables principales** :
- `auth.users`
- `partners`

**Points clés** :
- Formulaire de candidature
- Création du profil partenaire (status `pending`)
- Notification admin par email
- Email de confirmation au partenaire
- Dashboard en mode "en attente"

---

### 3. [Demande de Région](./03-flow-demande-region.md)

**Résumé** : Collecte des demandes d'expansion géographique pour prioriser le développement de nouvelles régions.

**Tables principales** :
- `region_requests` (à créer)

**Points clés** :
- Formulaire simple (email + région)
- Stockage des demandes
- Notification admin si seuil atteint
- Email de lancement lors de l'ouverture d'une région
- Dashboard admin pour prioriser

---

### 4. [Réservation d'Événement](./04-flow-reservation-evenement.md)

**Résumé** : Réservation d'une offre (événement, masterclass, consultation) par un membre, avec ou sans paiement.

**Tables principales** :
- `bookings`
- `offers`
- `offer_prices`
- `offer_media`

**Points clés** :
- Navigation et découverte des offres
- Vérification du stock
- Création de la réservation
- Paiement Stripe si offre payante
- Génération du QR code
- Email de confirmation
- Gestion du stock automatique

---

### 5. [Soumission d'Offres par le Partenaire](./05-flow-soumission-offres-partenaire.md)

**Résumé** : Création et soumission d'offres par les partenaires approuvés, avec validation admin.

**Tables principales** :
- `offers`
- `offer_prices`
- `offer_media`
- `categories`

**Points clés** :
- Formulaire multi-étapes
- Upload d'images
- Intégration Calendly
- Gestion du stock
- Soumission pour validation (status `pending`)
- Notification admin
- Email de confirmation partenaire

---

### 6. [Validation Admin - Approbation/Rejet Partenaire](./06-flow-validation-admin-partenaire.md)

**Résumé** : Validation des demandes de partenariat par l'équipe admin.

**Tables principales** :
- `partners`

**Points clés** :
- Dashboard admin avec filtres
- Approbation → status `approved`, création Stripe Connect
- Rejet → status `rejected`, raison du refus
- Emails automatiques (approbation/rejet)
- Triggers sur changement de statut
- Accès complet au dashboard après approbation

---

### 7. [Achat Client](./07-flow-achat-client.md)

**Résumé** : Achat d'une offre payante par un client, paiement, confirmation et génération du QR code.

**Tables principales** :
- `customer_orders`
- `bookings`
- `offers`

**Points clés** :
- Vérification du statut membre
- Création session Stripe Checkout
- Paiement et webhook
- Génération QR code sécurisé
- Email de confirmation avec QR code
- Notification partenaire
- Enregistrement dans `customer_orders`

---

## 🗄️ Architecture de la Base de Données

### Tables Principales

| Table | Description | Flow(s) |
|-------|-------------|---------|
| `auth.users` | Authentification Supabase | 1, 2 |
| `user_profiles` | Profils utilisateurs | 1 |
| `subscriptions` | Abonnements Stripe | 1 |
| `partners` | Partenaires de la plateforme | 2, 6 |
| `offers` | Offres proposées | 4, 5, 7 |
| `offer_prices` | Tarification des offres | 4, 5, 7 |
| `offer_media` | Images/vidéos des offres | 5 |
| `bookings` | Réservations | 4, 7 |
| `customer_orders` | Commandes clients | 7 |
| `region_requests` | Demandes de régions | 3 |
| `stripe_webhook_events` | Log des webhooks Stripe | 1, 4, 7 |
| `pending_signups` | Inscriptions en cours | 1 |

### Diagramme ERD Simplifié

```
auth.users
    ↓
user_profiles ──→ subscriptions
    ↓
    ├──→ bookings ──→ offers ──→ partners
    │                    ↓
    │                offer_prices
    │                    ↓
    │                offer_media
    │
    └──→ customer_orders
```

---

## 🔐 Sécurité (Row Level Security)

Toutes les tables sensibles ont des policies RLS activées :

### Principes généraux

1. **Les utilisateurs voient leurs propres données**
   - `user_profiles` : `user_id = auth.uid()`
   - `bookings` : `user_id = auth.uid()`
   - `customer_orders` : `user_id = auth.uid()`

2. **Les partenaires voient leurs données**
   - `partners` : `user_id = auth.uid()`
   - `offers` : `partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())`
   - `bookings` : `partner_id IN (...)`

3. **Les admins voient tout**
   - Vérification : `EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_admin = true)`

4. **Service role a tous les droits**
   - Pour les Edge Functions
   - `USING (true) WITH CHECK (true)`

---

## 🔄 Edge Functions Supabase

### Liste des fonctions

| Fonction | Description | Flow(s) |
|----------|-------------|---------|
| `link-auth-to-profile` | Création du profil utilisateur | 1 |
| `create-subscription-session` | Session Stripe abonnement | 1 |
| `create-offer-session` | Session Stripe offre | 4, 7 |
| `stripe-webhook` | Traitement webhooks Stripe | 1, 4, 7 |
| `send-emails` | Envoi d'emails génériques | Tous |
| `send-partner-notification` | Notification nouveau partenaire | 2 |
| `send-partner-confirmation` | Confirmation candidature | 2 |
| `send-partner-approval` | Approbation partenaire | 6 |
| `send-partner-rejection` | Rejet partenaire | 6 |
| `send-offer-notification` | Notification nouvelle offre | 5 |
| `booking-created` | Confirmation réservation | 4, 7 |
| `notify-region-launch` | Lancement nouvelle région | 3 |
| `create-stripe-connect-account` | Compte Stripe Connect | 6 |

---

## ⚠️ Problèmes Actuels Identifiés

### 🔴 Critiques (à résoudre en priorité)

1. **Synchronisation auth.users ↔ user_profiles**
   - Risque de profils orphelins
   - Pas de rollback automatique

2. **Gestion du stock**
   - Race condition possible
   - Stock peut devenir négatif

3. **QR Code sécurité**
   - Pas de signature cryptographique
   - Pas d'expiration
   - Risque de fraude

4. **Webhooks Stripe**
   - Pas de retry automatique en cas d'échec
   - Idempotence à vérifier

### 🟡 Importants (à améliorer)

1. **Validation des données**
   - Manque de validation côté serveur
   - Formats non vérifiés (téléphone, adresse)

2. **Upload d'images**
   - Pas de compression automatique
   - Pas de validation du format
   - Fichiers trop lourds possibles

3. **Politique d'annulation**
   - Pas de règles claires
   - Pas de remboursement automatique

4. **Table region_requests**
   - N'existe pas encore
   - Fonction `submitRegionRequest()` à créer

### 🟢 Améliorations futures

1. **KYC partenaires**
   - Vérification SIRET
   - Documents justificatifs
   - Scoring automatique

2. **Analytics**
   - Tracking des conversions
   - Métriques de performance
   - A/B testing

3. **Notifications push**
   - Alertes en temps réel
   - Rappels d'événements

---

## 🧪 Tests Recommandés

### Tests End-to-End

- [ ] Flow complet inscription → abonnement → réservation
- [ ] Flow complet candidature partenaire → approbation → création offre
- [ ] Flow complet achat offre payante → paiement → confirmation

### Tests Unitaires

- [ ] Création de profil utilisateur
- [ ] Validation des webhooks Stripe
- [ ] Génération de QR code
- [ ] Décrémentation du stock
- [ ] Envoi d'emails

### Tests de Sécurité

- [ ] RLS policies fonctionnent correctement
- [ ] Impossibilité d'accéder aux données d'autres utilisateurs
- [ ] Validation des permissions admin
- [ ] Signature des webhooks Stripe

---

## 📊 Métriques à Suivre

### Business

- Taux de conversion visiteur → abonné
- Taux de rétention mensuelle
- Revenu moyen par utilisateur (ARPU)
- Nombre de partenaires actifs
- Nombre d'offres publiées
- Taux de réservation

### Technique

- Temps de réponse des API
- Taux d'erreur des webhooks
- Taux de succès des paiements
- Disponibilité de la plateforme (uptime)

---

## 🔗 Ressources

### Documentation externe

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### Outils

- **Supabase Dashboard** : Gestion de la base de données
- **Stripe Dashboard** : Gestion des paiements
- **Netlify** : Hébergement frontend
- **GitHub Actions** : CI/CD

---

## 📝 Notes de Développement

### Conventions de code

- **TypeScript** : Typage strict activé
- **ESLint** : Configuration standard
- **Naming** :
  - Tables : `snake_case`
  - Fonctions : `camelCase`
  - Composants : `PascalCase`

### Workflow Git

1. Créer une branche : `feature/nom-feature`
2. Développer et tester
3. Pull Request vers `main`
4. Review et merge
5. Déploiement automatique

---

## 🚀 Prochaines Étapes

### Court terme (1-2 semaines)

1. ✅ Créer la table `region_requests`
2. ✅ Implémenter la fonction `submitRegionRequest()`
3. ✅ Sécuriser les QR codes (signature)
4. ✅ Ajouter retry mechanism pour webhooks
5. ✅ Corriger la synchronisation auth ↔ profiles

### Moyen terme (1-2 mois)

1. Implémenter KYC partenaires
2. Ajouter compression d'images
3. Créer dashboard analytics
4. Améliorer la gestion du stock (verrouillage optimiste)
5. Politique d'annulation et remboursements

### Long terme (3-6 mois)

1. Application mobile (React Native)
2. Notifications push
3. Programme de fidélité
4. Marketplace de partenaires
5. API publique pour partenaires

---

## 📞 Support

Pour toute question sur cette documentation :
- **Email** : dev@nowme.fr
- **Slack** : #dev-nowme
- **GitHub Issues** : [Créer une issue](https://github.com/nowme/club-nowme/issues)

---

**Dernière mise à jour** : Novembre 2024  
**Version** : 1.0  
**Auteur** : Équipe Technique Nowme
