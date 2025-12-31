-- Add tva_intra column to partners if it doesn't exist
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tva_intra TEXT;

-- Verify siret column exists (it should, but just in case)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS siret TEXT;
