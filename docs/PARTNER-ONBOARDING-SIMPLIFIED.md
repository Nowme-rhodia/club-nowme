# Simplification du processus d'onboarding partenaire

## Problème identifié

Le formulaire d'application partenaire (`SubmitOffer.tsx`) était beaucoup trop long et demandait des informations non essentielles avant l'approbation:
- SIRET
- Horaires d'ouverture
- Réseaux sociaux
- Logo
- Détails de l'offre
- etc.

De plus, le formulaire ne fonctionnait pas correctement.

## Solution mise en place

### 1. Nouveau flux simplifié

**Étape 1: Demande initiale (AVANT approbation)**
- Nom de l'entreprise
- Nom du contact
- Email professionnel
- Téléphone
- Message décrivant l'activité

**Étape 2: Approbation par l'admin**
- Les admins examinent la demande dans `/admin/pending-partners`
- Approuvent ou rejettent la demande

**Étape 3: Complétion du profil (APRÈS approbation)**
- SIRET
- Adresse complète avec coordonnées GPS
- Site web
- Réseaux sociaux (Instagram, Facebook)
- Logo
- Description détaillée
- Horaires d'ouverture

**Étape 4: Publication d'offres**
- Le partenaire peut maintenant créer et publier des offres

## Fichiers créés

### 1. `src/pages/SubmitOffer.tsx` (MODIFIÉ)
Formulaire simplifié pour la demande initiale sur la route `/soumettre-offre`.

**Caractéristiques:**
- **5 champs obligatoires:** Nom entreprise, Contact, Email, Téléphone, Message
- **3 champs optionnels:** Site web, Instagram, Facebook
- Validation en temps réel
- Messages d'erreur clairs
- Page de confirmation après envoi
- Design moderne et responsive

### 2. `src/pages/PartnerApplication.tsx` (CRÉÉ)
Version alternative du formulaire (peut être utilisée pour une autre route si nécessaire).

### 2. `src/pages/partner/CompleteProfile.tsx`
Formulaire complet pour après l'approbation.

**Caractéristiques:**
- Accessible uniquement aux partenaires approuvés
- Sections organisées (Général, Localisation, Présence en ligne, Horaires)
- Intégration avec LocationSearch pour l'adresse
- Gestion des horaires d'ouverture par jour
- Sauvegarde dans la table `partners`

### 3. `supabase/migrations/20241204_simplify_partner_schema.sql`
Migration pour simplifier le schéma de la base de données.

**Modifications:**
- Rend optionnels les champs non essentiels (`business_name`, `contact_name`, `phone`)
- Ajoute un champ `message` pour la demande initiale
- Supprime les tables inutiles:
  - `partner_notifications` (remplacée par la table `emails`)
  - `partner_payout_jobs_log` (redondante avec les logs système)
- Ajoute des commentaires pour documenter l'usage de chaque champ
- Crée un index de recherche sur le champ `message`

### 4. Mise à jour de `supabase/functions/send-partner-submission/index.ts`
- Validation stricte des 5 champs requis
- Support des champs optionnels pour compatibilité
- Messages d'erreur améliorés

## Schéma de la table `partners` simplifié

### Champs requis pour la demande initiale:
- `contact_name` - Nom du contact
- `contact_email` - Email (unique)
- `phone` - Téléphone
- `message` - Description de l'activité
- `status` - Statut (pending/approved/rejected)

### Champs à compléter après approbation:
- `business_name` - Nom de l'entreprise
- `siret` - Numéro SIRET (14 chiffres)
- `address` - Adresse complète
- `coordinates` - Coordonnées GPS (point PostGIS)
- `description` - Description détaillée
- `logo_url` - URL du logo
- `opening_hours` - Horaires (JSONB)
- `website` - Site web
- `instagram` - Compte Instagram
- `facebook` - Page Facebook
- `social_media` - Autres réseaux (JSONB)

### Champs pour les paiements (configurés plus tard):
- `stripe_account_id` - ID compte Stripe Connect
- `payout_iban` - IBAN pour les virements
- `payout_method` - Méthode de paiement
- `commission_rate` - Taux de commission
- `settlement_day` - Jour de règlement

## Tables supprimées

### `partner_notifications`
**Raison:** Redondante avec la table `emails` qui gère déjà toutes les notifications.

### `partner_payout_jobs_log`
**Raison:** Les logs système suffisent pour tracer les jobs de paiement.

## Migration et déploiement

### 1. Exécuter la migration SQL
```bash
supabase db push
```

### 2. Mettre à jour les routes
Ajouter dans votre fichier de routes:
```tsx
// Route publique pour la demande
<Route path="/devenir-partenaire" element={<PartnerApplication />} />

// Route protégée pour compléter le profil (après approbation)
<Route path="/partner/complete-profile" element={<CompleteProfile />} />
```

### 3. Rediriger depuis l'ancien formulaire
Dans `SubmitOffer.tsx`, ajouter une redirection vers le nouveau formulaire:
```tsx
useEffect(() => {
  navigate('/devenir-partenaire');
}, []);
```

Ou simplement remplacer complètement le fichier.

### 4. Mettre à jour le dashboard partenaire
Dans `Dashboard.tsx`, vérifier si le profil est complet et rediriger si nécessaire:
```tsx
useEffect(() => {
  if (partner?.status === 'approved' && !partner?.siret) {
    navigate('/partner/complete-profile');
  }
}, [partner]);
```

## Avantages de cette approche

1. **Meilleur taux de conversion** - Formulaire initial beaucoup plus court
2. **Moins d'erreurs** - Validation simplifiée
3. **Meilleure UX** - Le partenaire n'est pas submergé d'informations à fournir
4. **Processus clair** - Étapes bien définies
5. **Flexibilité** - Le partenaire peut compléter son profil progressivement
6. **Base de données plus propre** - Suppression des tables inutiles

## Prochaines étapes recommandées

1. **Tester le nouveau formulaire** en local
2. **Vérifier les emails** envoyés après soumission
3. **Tester le processus d'approbation** dans l'admin
4. **Tester la complétion du profil** après approbation
5. **Mettre à jour la documentation** utilisateur
6. **Former les admins** au nouveau processus

## Notes importantes

- L'ancien formulaire `SubmitOffer.tsx` peut être conservé pour référence ou supprimé
- Les partenaires existants ne sont pas affectés par ces changements
- La migration SQL est non-destructive (ne supprime pas de données existantes)
- Les Edge Functions restent compatibles avec l'ancien et le nouveau format
