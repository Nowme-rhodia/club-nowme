-- Add signup_reminder_sent to user_profiles to track reminder emails
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS signup_reminder_sent boolean DEFAULT false;
