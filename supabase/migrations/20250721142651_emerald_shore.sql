/*
  # Fix user profiles and authentication system

  1. Tables
    - Fix user_profiles structure and policies
    - Ensure proper RLS configuration
    - Add missing columns if needed

  2. Security
    - Enable RLS on all tables
    - Create proper policies for user access
    - Allow service role operations

  3. Functions
    - Create helper functions for user management
    - Add triggers for automatic operations
*/

-- First, ensure user_profiles has all required columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS subscription_type text;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Temporarily disable RLS to fix policies
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow Insert from Webhook" ON user_profiles;
DROP POLICY IF EXISTS "Allow Update only for Service Role" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow service role (webhooks) to insert and update
CREATE POLICY "Allow service role operations" ON user_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can create their own profile" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION is_premium_member()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
    AND subscription_type = 'premium'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create member_rewards table if it doesn't exist
CREATE TABLE IF NOT EXISTS member_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  points_earned integer DEFAULT 0,
  points_spent integer DEFAULT 0,
  points_balance integer DEFAULT 0,
  last_activity_date timestamptz DEFAULT now(),
  tier_level text DEFAULT 'bronze' CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on member_rewards
ALTER TABLE member_rewards ENABLE ROW LEVEL SECURITY;

-- Create policy for member_rewards
CREATE POLICY "Users can view their rewards" ON member_rewards
FOR SELECT TO authenticated
USING (user_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
));

-- Function to create member rewards automatically
CREATE OR REPLACE FUNCTION create_member_rewards()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO member_rewards (user_id, points_earned, points_spent, points_balance, tier_level)
  VALUES (NEW.id, 0, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic rewards creation
DROP TRIGGER IF EXISTS create_member_rewards_trigger ON user_profiles;
CREATE TRIGGER create_member_rewards_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION create_member_rewards();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription ON user_profiles(subscription_status, subscription_type);
CREATE INDEX IF NOT EXISTS idx_member_rewards_user ON member_rewards(user_id);