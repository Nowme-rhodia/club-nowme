-- Add column for terms acceptance to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing users
UPDATE user_profiles SET terms_accepted_at = NOW() WHERE terms_accepted_at IS NULL;
