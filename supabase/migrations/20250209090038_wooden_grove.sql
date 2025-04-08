/*
  # Add Stripe support
  
  1. New Columns
    - Add stripe_customer_id to user_profiles
    - Add stripe_subscription_id to user_profiles
  
  2. Indexes
    - Add index on stripe_customer_id for faster lookups
*/

-- Add Stripe columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id 
ON user_profiles(stripe_customer_id);

-- Add comments
COMMENT ON COLUMN user_profiles.stripe_customer_id IS 'Stripe customer ID for the user';
COMMENT ON COLUMN user_profiles.stripe_subscription_id IS 'Stripe subscription ID for the user';