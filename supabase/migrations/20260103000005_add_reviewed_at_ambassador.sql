ALTER TABLE ambassador_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
