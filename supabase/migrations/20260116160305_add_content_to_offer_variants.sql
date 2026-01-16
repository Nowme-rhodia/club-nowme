ALTER TABLE offer_variants ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '[]'::jsonb;
