-- Add column for terms acceptance
ALTER TABLE partners ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing partners (assuming they accepted "implicitly" or via previous agreement)
UPDATE partners SET terms_accepted_at = NOW() WHERE terms_accepted_at IS NULL;
