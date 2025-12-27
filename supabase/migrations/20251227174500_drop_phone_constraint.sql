-- Migration: Drop strict phone constraint
-- Description: Removes the user_profiles_phone_check constraint to allow user input.

ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_phone_check;
