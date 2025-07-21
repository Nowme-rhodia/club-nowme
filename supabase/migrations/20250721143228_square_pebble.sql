/*
  # Fix existing policies and permissions

  1. Updates
    - Fix existing policies that use invalid functions
    - Add missing service_role permissions
    - Create helper functions for auth checks

  2. Security
    - Update RLS policies to use correct functions
    - Add service_role access where needed
*/

-- Drop and recreate problematic policies
DROP POLICY IF EXISTS "Allow Update only for Service Role" ON user_profiles;
DROP POLICY IF EXISTS "Allow Insert from Webhook" ON user_profiles;

-- Create helper function for checking if user is service role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS boolean AS $$
BEGIN
  RETURN current_setting('role') = 'service_role';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for checking subscription status
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for checking if user is premium
CREATE OR REPLACE FUNCTION is_premium_member()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
    AND subscription_type = 'premium'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add correct service role policies for user_profiles
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update profiles" ON user_profiles
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can read profiles" ON user_profiles
  FOR SELECT TO service_role
  USING (true);

-- Update existing policies to use correct functions (if they exist)
DO $$
BEGIN
  -- Try to update the premium features policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'premium_features' 
    AND policyname = 'Require active subscription for premium features'
  ) THEN
    DROP POLICY "Require active subscription for premium features" ON premium_features;
    CREATE POLICY "Require active subscription for premium features" ON premium_features
      FOR ALL TO public
      USING (check_subscription_status());
  END IF;

  -- Try to update community challenges policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'community_challenges' 
    AND policyname = 'Members can view challenges'
  ) THEN
    DROP POLICY "Members can view challenges" ON community_challenges;
    CREATE POLICY "Members can view challenges" ON community_challenges
      FOR SELECT TO authenticated
      USING (check_subscription_status());
  END IF;

  -- Try to update club events policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'club_events' 
    AND policyname = 'Members can view events'
  ) THEN
    DROP POLICY "Members can view events" ON club_events;
    CREATE POLICY "Members can view events" ON club_events
      FOR SELECT TO authenticated
      USING (check_subscription_status());
  END IF;

  -- Try to update masterclasses policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'masterclasses' 
    AND policyname = 'Premium members can access masterclasses'
  ) THEN
    DROP POLICY "Premium members can access masterclasses" ON masterclasses;
    CREATE POLICY "Premium members can access masterclasses" ON masterclasses
      FOR SELECT TO authenticated
      USING (is_premium_member());
  END IF;

  -- Try to update club boxes policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'club_boxes' 
    AND policyname = 'Premium members can view boxes'
  ) THEN
    DROP POLICY "Premium members can view boxes" ON club_boxes;
    CREATE POLICY "Premium members can view boxes" ON club_boxes
      FOR SELECT TO authenticated
      USING (is_premium_member());
  END IF;

END $$;

-- Create a simple test user creation function
CREATE OR REPLACE FUNCTION create_test_user(
  user_email text,
  user_password text,
  first_name text DEFAULT 'Test',
  last_name text DEFAULT 'User',
  phone text DEFAULT '+33612345678',
  sub_type text DEFAULT 'premium'
)
RETURNS uuid AS $$
DECLARE
  user_uuid uuid;
BEGIN
  user_uuid := gen_random_uuid();
  
  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    user_email, crypt(user_password, gen_salt('bf')),
    now(), now(), now(), '{}', '{}', false
  );
  
  -- Create user profile
  INSERT INTO user_profiles (
    user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type
  ) VALUES (
    user_uuid, user_email, first_name, last_name, phone,
    'active', sub_type
  );
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;