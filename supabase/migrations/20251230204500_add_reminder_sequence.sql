-- Add columns to track the 3-step email sequence
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS reminder_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- Optional: Migrate existing 'signup_reminder_sent' boolean to step 1
-- If true, it means they got the first email, so we set step to 1.
UPDATE user_profiles
SET reminder_step = 1, last_reminder_sent_at = NOW()
WHERE signup_reminder_sent = true AND reminder_step = 0;
