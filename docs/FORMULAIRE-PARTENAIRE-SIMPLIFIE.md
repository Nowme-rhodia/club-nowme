# Formulaire Partenaire Simplifié - Route /soumettre-offre

## ✅ Changements effectués

Le formulaire sur `/soumettre-offre` a été **drastiquement simplifié** pour améliorer le taux de conversion.

### Avant (formulaire complexe en 3 étapes)
- **Étape 1:** 10+ champs (entreprise, SIRET, adresse complète, logo, description, horaires)
- **Étape 2:** Détails de l'offre (titre, description, catégorie, prix, localisation)
- **Étape 3:** Récapitulatif et validation
- **Problème:** Trop long, décourageant, ne fonctionnait pas correctement

### Après (formulaire simplifié en 1 page)

#### Champs obligatoires (5)
1. **Nom de l'entreprise** - Ex: "Spa Zen & Bien-être"
2. **Nom du contact** - Ex: "Marie Dupont"
3. **Email professionnel** - Ex: "contact@spa-zen.fr"
4. **Téléphone** - Ex: "0612345678" (10 chiffres)
5. **Message** - Description de l'activité (minimum 20 caractères)

#### Champs optionnels (3)
6. **Site web** - Ex: "https://spa-zen.fr"
7. **Instagram** - Ex: "@spa_zen"
8. **Facebook** - Ex: "SpaZenBienEtre"

## Flux utilisateur

```
┌─────────────────────────────────────┐
│  1. Applicant remplit le formulaire │
│     (8 champs max, 5 requis)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Soumission → Email envoyé       │
│     - Admin: notification           │
│     - Applicant: confirmation       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Admin approuve/rejette          │
│     (via /admin/partners)           │
└──────────────┬──────────────────────┘
               │
               ▼ (si approuvé)
┌─────────────────────────────────────┐
│  4. Partenaire complète son profil  │
│     - SIRET                         │
│     - Adresse complète              │
│     - Logo, horaires, etc.          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Partenaire peut créer des offres│
└─────────────────────────────────────┘
```

## Validation

### Champs obligatoires
- **businessName:** Non vide
- **contactName:** Non vide
- **email:** Format email valide (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **phone:** 10 chiffres (espaces autorisés)
- **message:** Minimum 20 caractères

### Champs optionnels
- **website:** Format URL (si rempli)
- **instagram:** Texte libre
- **facebook:** Texte libre

## Données envoyées à l'API

```typescript
{
  business: {
    name: string;           // Requis
    contactName: string;    // Requis
    email: string;          // Requis
    phone: string;          // Requis
    message: string;        // Requis
    website?: string;       // Optionnel
    instagram?: string;     // Optionnel
    facebook?: string;      // Optionnel
  }
}
```

## Fichiers modifiés

### 1. `src/pages/SubmitOffer.tsx`
- ✅ Suppression du système multi-étapes
- ✅ Suppression de tous les champs non essentiels
- ✅ Formulaire en une seule page
- ✅ Validation simplifiée
- ✅ Design moderne et responsive

### 2. `supabase/functions/send-partner-submission/index.ts`
- ✅ Validation mise à jour pour les 5 champs requis
- ✅ Support des champs optionnels (website, instagram, facebook)
- ✅ Messages d'erreur améliorés

### 3. `supabase/migrations/20241204_simplify_partner_schema.sql`
- ✅ Champs rendus optionnels dans la DB
- ✅ Ajout du champ `message`
- ✅ Suppression des tables inutiles

## Avantages

### Pour l'applicant
- ⚡ **Rapide:** 2-3 minutes au lieu de 10-15 minutes
- 🎯 **Simple:** Seulement les infos essentielles
- 📱 **Mobile-friendly:** Formulaire court adapté aux mobiles
- ✅ **Moins d'erreurs:** Moins de champs = moins de risques d'erreur

### Pour Nowme
- 📈 **Meilleur taux de conversion:** Formulaire court = plus de soumissions
- 🎯 **Qualification rapide:** Les infos essentielles suffisent pour évaluer
- 🔄 **Processus clair:** Approbation d'abord, détails ensuite
- 🧹 **Base de données propre:** Pas de données incomplètes

## Test du formulaire

### URL
```
http://localhost:5173/soumettre-offre
```

### Données de test
```
Nom entreprise: Spa Zen Test
Contact: Marie Test
Email: marie@test.fr
Téléphone: 0612345678
Message: Nous sommes un spa spécialisé dans les massages bien-être et la relaxation. Nous souhaitons rejoindre Nowme Club pour toucher une nouvelle clientèle.
Site web: https://spa-zen-test.fr
Instagram: @spa_zen_test
Facebook: SpaZenTest
```

## Prochaines étapes

1. ✅ Tester le formulaire en local
2. ✅ Vérifier les emails envoyés
3. ✅ Tester l'approbation admin
4. ⏳ Déployer en production
5. ⏳ Monitorer le taux de conversion

## Notes importantes

- Les partenaires existants ne sont **pas affectés**
- Le formulaire est **rétrocompatible** avec l'API existante
- Les champs optionnels peuvent être ajoutés/retirés facilement
- Le design suit la charte graphique Nowme Club

## Support

Pour toute question ou problème:
1. Vérifier les logs de la fonction Edge: `supabase functions logs send-partner-submission`
2. Vérifier la table `partners` dans Supabase
3. Vérifier la table `emails` pour les notifications
