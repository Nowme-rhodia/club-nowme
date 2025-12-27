-- Migration: Add detailed profile fields to user_profiles
-- Description: Adds birth_date, acquisition_source, and signup_goal for the welcome flow.

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
ADD COLUMN IF NOT EXISTS signup_goal TEXT;

-- Verify if RLS allows updates (It should with 'Users can update own profile' from restore_login_only.sql)
-- But just in case, we can comment it out as the policy is already there.
-- CREATE POLICY "Users can update own profile" ...
