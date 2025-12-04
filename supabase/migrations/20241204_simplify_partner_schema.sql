-- Migration: Simplification du schéma partenaire
-- Date: 2024-12-04
-- Description: Rend optionnels les champs non essentiels pour la demande initiale

-- 1. Rendre optionnels les champs qui ne sont pas nécessaires lors de la demande initiale
ALTER TABLE public.partners 
  ALTER COLUMN business_name DROP NOT NULL,
  ALTER COLUMN contact_name DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL;

-- 2. Ajouter un champ message pour la demande initiale (si pas déjà présent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'partners' 
    AND column_name = 'message'
  ) THEN
    ALTER TABLE public.partners ADD COLUMN message TEXT;
  END IF;
END $$;

-- 3. Supprimer les tables non essentielles (si elles existent et ne sont pas utilisées)
-- Note: Vérifiez d'abord qu'elles ne contiennent pas de données importantes

-- Supprimer partner_notifications si elle existe (peut être remplacée par la table emails)
DROP TABLE IF EXISTS public.partner_notifications CASCADE;

-- Supprimer partner_payout_jobs_log si elle existe (redondante avec les logs système)
DROP TABLE IF EXISTS public.partner_payout_jobs_log CASCADE;

-- 4. Commentaires pour documenter les champs essentiels
COMMENT ON COLUMN public.partners.business_name IS 'Nom de l''entreprise - requis après approbation';
COMMENT ON COLUMN public.partners.contact_name IS 'Nom du contact - requis pour la demande initiale';
COMMENT ON COLUMN public.partners.contact_email IS 'Email du contact - requis pour la demande initiale';
COMMENT ON COLUMN public.partners.phone IS 'Téléphone - requis pour la demande initiale';
COMMENT ON COLUMN public.partners.message IS 'Message de demande initiale';
COMMENT ON COLUMN public.partners.status IS 'Statut: pending (en attente), approved (approuvé), rejected (rejeté)';
COMMENT ON COLUMN public.partners.siret IS 'SIRET - à compléter après approbation';
COMMENT ON COLUMN public.partners.address IS 'Adresse complète - à compléter après approbation';
COMMENT ON COLUMN public.partners.website IS 'Site web - optionnel';
COMMENT ON COLUMN public.partners.logo_url IS 'URL du logo - à compléter après approbation';
COMMENT ON COLUMN public.partners.description IS 'Description détaillée - à compléter après approbation';
COMMENT ON COLUMN public.partners.opening_hours IS 'Horaires d''ouverture (JSON) - à compléter après approbation';
COMMENT ON COLUMN public.partners.social_media IS 'Réseaux sociaux (JSON) - optionnel';
COMMENT ON COLUMN public.partners.stripe_account_id IS 'ID compte Stripe - configuré après approbation';
COMMENT ON COLUMN public.partners.payout_iban IS 'IBAN pour les paiements - configuré après approbation';

-- 5. Créer un index sur le message pour la recherche (optionnel)
CREATE INDEX IF NOT EXISTS idx_partners_message ON public.partners USING gin(to_tsvector('french', message))
WHERE message IS NOT NULL;
