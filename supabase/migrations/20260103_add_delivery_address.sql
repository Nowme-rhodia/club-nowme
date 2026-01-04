-- Add delivery_address column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS delivery_address text;
