-- Add requires_agenda column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS requires_agenda BOOLEAN DEFAULT false;

-- Policy Update (if needed) - usually readable by everyone
-- No RLS change needed if already public read.

-- Comment
COMMENT ON COLUMN offers.requires_agenda IS 'If true, user must select a date/slot before purchasing (one booking per person enforced).';
