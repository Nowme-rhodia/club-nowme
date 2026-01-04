-- Add columns to track ambassador mandate duration and notifications
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS ambassador_start_date timestamptz,
ADD COLUMN IF NOT EXISTS ambassador_last_reminder_at timestamptz;

-- Comment on columns
COMMENT ON COLUMN user_profiles.ambassador_start_date IS 'Date when the current ambassador mandate started (or was last renewed).';
COMMENT ON COLUMN user_profiles.ambassador_last_reminder_at IS 'Date when the last 5.5-month validity reminder was sent.';
