# Fix: Erreur 500 lors de la soumission du formulaire partenaire

## Problème

Lors de la soumission du formulaire `/soumettre-offre`, une erreur 500 se produit:
```
FunctionsHttpError: Edge Function returned a non-2xx status code
```

## Cause

La table `partners` a une contrainte `user_id NOT NULL`, mais le formulaire de demande initiale ne crée pas encore de compte utilisateur. Le `user_id` ne devrait être assigné qu'après l'approbation de la demande par un admin.

## Solution

### 1. Exécuter les migrations SQL

Deux migrations sont nécessaires:

#### Migration 1: Rendre user_id nullable
```bash
# Fichier: supabase/migrations/20241204_make_user_id_nullable.sql
```

Cette migration:
- Rend la colonne `user_id` nullable
- Modifie la contrainte unique pour permettre NULL
- Permet de créer des demandes sans user_id

#### Migration 2: Simplifier le schéma (optionnel)
```bash
# Fichier: supabase/migrations/20241204_simplify_partner_schema.sql
```

Cette migration:
- Ajoute le champ `message` (optionnel, on utilise `description` pour l'instant)
- Supprime les tables inutiles

### 2. Appliquer les migrations

```bash
# En local
supabase db push

# Ou via le dashboard Supabase
# Copier-coller le contenu de la migration dans l'éditeur SQL
```

### 3. Redéployer la fonction Edge

La fonction a été modifiée pour:
- Utiliser `description` au lieu de `message` (compatible avec le schéma actuel)
- Retourner des erreurs détaillées en mode dev
- Ne pas requérir de `user_id`

```bash
# Redéployer la fonction
supabase functions deploy send-partner-submission
```

## Vérification

### 1. Vérifier que la migration a fonctionné

```sql
-- Dans le SQL Editor de Supabase
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name = 'user_id';

-- Résultat attendu: is_nullable = 'YES'
```

### 2. Tester le formulaire

1. Aller sur `http://localhost:5173/soumettre-offre`
2. Le formulaire devrait être pré-rempli (mode dev)
3. Cliquer sur "Envoyer ma demande"
4. Vérifier que la soumission réussit

### 3. Vérifier dans la base de données

```sql
-- Vérifier que le partenaire a été créé
SELECT id, business_name, contact_email, user_id, status 
FROM partners 
ORDER BY created_at DESC 
LIMIT 5;

-- Le user_id devrait être NULL pour les nouvelles demandes
```

## Flux après la migration

```
1. Applicant soumet le formulaire
   ↓
2. Création d'un partner avec user_id = NULL, status = 'pending'
   ↓
3. Admin reçoit un email de notification
   ↓
4. Admin approuve la demande dans /admin/partners
   ↓
5. Création d'un compte utilisateur (email + mot de passe temporaire)
   ↓
6. Mise à jour du partner avec le user_id
   ↓
7. Partenaire reçoit un email avec ses identifiants
   ↓
8. Partenaire se connecte et complète son profil
```

## Modifications apportées

### Fichiers modifiés

1. **`supabase/functions/send-partner-submission/index.ts`**
   - Utilise `description` au lieu de `message`
   - Ajoute des logs détaillés pour le debug
   - Ne requiert plus de `user_id`

2. **`src/pages/SubmitOffer.tsx`**
   - Formulaire simplifié (8 champs)
   - Données de test pré-remplies en mode dev

### Fichiers créés

1. **`supabase/migrations/20241204_make_user_id_nullable.sql`**
   - Rend `user_id` nullable
   - Modifie la contrainte unique

2. **`supabase/migrations/20241204_simplify_partner_schema.sql`**
   - Simplifie le schéma (optionnel)

## Commandes utiles

```bash
# Voir les logs de la fonction Edge
supabase functions logs send-partner-submission --follow

# Tester la fonction localement
supabase functions serve send-partner-submission

# Vérifier l'état des migrations
supabase migration list

# Rollback si nécessaire (attention!)
supabase db reset
```

## Notes importantes

- ⚠️ **En production:** Assurez-vous d'exécuter les migrations avant de déployer le nouveau code
- ⚠️ **Données existantes:** Les partenaires existants avec `user_id` ne sont pas affectés
- ⚠️ **Processus d'approbation:** L'admin devra créer manuellement un compte utilisateur lors de l'approbation

## Prochaines étapes

1. ✅ Exécuter la migration `20241204_make_user_id_nullable.sql`
2. ✅ Redéployer la fonction `send-partner-submission`
3. ⏳ Tester le formulaire
4. ⏳ Mettre à jour le processus d'approbation admin pour créer le compte utilisateur
5. ⏳ Créer un email template pour envoyer les identifiants au partenaire approuvé
