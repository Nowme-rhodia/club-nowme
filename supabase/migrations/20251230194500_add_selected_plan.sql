-- Add selected_plan to user_profiles to track intended subscription
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS selected_plan text;
