-- Add legal info columns to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS siret TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tva_intra TEXT;

-- Refresh schema cache policy if needed (implicit in supabase)
