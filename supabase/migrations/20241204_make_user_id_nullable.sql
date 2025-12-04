-- Migration: Rendre user_id nullable pour les demandes de partenariat
-- Date: 2024-12-04
-- Description: Permet de créer des demandes de partenariat sans user_id (avant approbation)

-- 1. Supprimer la contrainte NOT NULL sur user_id
ALTER TABLE public.partners 
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Modifier la contrainte unique pour permettre NULL
-- Supprimer l'ancienne contrainte unique
ALTER TABLE public.partners 
  DROP CONSTRAINT IF EXISTS partners_user_id_key;

-- Recréer avec une contrainte partielle (uniquement pour les user_id non NULL)
CREATE UNIQUE INDEX IF NOT EXISTS partners_user_id_key 
  ON public.partners (user_id) 
  WHERE user_id IS NOT NULL;

-- 3. Commentaire pour documenter
COMMENT ON COLUMN public.partners.user_id IS 'ID utilisateur - NULL pour les demandes en attente, rempli après approbation';

-- 4. Note: Après approbation, l'admin devra créer un compte utilisateur et lier le user_id
