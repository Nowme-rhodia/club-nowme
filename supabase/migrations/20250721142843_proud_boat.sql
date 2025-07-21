/*
  # Fix user profiles and authentication system

  1. Tables
    - Fix user_profiles policies to work with current Supabase version
    - Create member_rewards table with proper policies
    - Add proper indexes for performance

  2. Security
    - Enable RLS on all tables
    - Add policies that work with current auth system
    - Fix service role access

  3. Functions
    - Create helper functions for user management
    - Add triggers for automatic reward creation
*/

-- First, let's check if user_profiles table exists and fix it
DO $$ 
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_type') THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow Insert from Webhook" ON user_profiles;
DROP POLICY IF EXISTS "Allow Update only for Service Role" ON user_profiles;

-- Create new policies that work with current Supabase
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy for service role (webhooks, admin operations)
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users to insert (for profile completion)
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

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

-- Policies for member_rewards
CREATE POLICY "Users can view their rewards" ON member_rewards
  FOR SELECT 
  TO authenticated
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage rewards" ON member_rewards
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to create member rewards automatically
CREATE OR REPLACE FUNCTION create_member_rewards()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO member_rewards (user_id, points_earned, points_spent, points_balance, tier_level)
  VALUES (NEW.id, 0, 0, 0, 'bronze');
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue without failing the main operation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create member rewards when user profile is created
DROP TRIGGER IF EXISTS create_member_rewards_trigger ON user_profiles;
CREATE TRIGGER create_member_rewards_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION create_member_rewards();

-- Add useful indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_member_rewards_user ON member_rewards(user_id);

-- Function to check if user is premium (useful for policies)
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

-- Update updated_at column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();