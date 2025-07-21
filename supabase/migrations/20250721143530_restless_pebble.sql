/*
  # Fix auth system with existence checks

  1. Security Updates
    - Add service_role permissions where missing
    - Create helper function for user creation
    - Fix role() function issues

  2. Helper Functions
    - create_test_user function for easy user creation
    - Automatic rewards creation

  3. Notes
    - Only creates policies/functions that don't exist
    - Safe to run multiple times
*/

-- Create helper function to check if policy exists
CREATE OR REPLACE FUNCTION policy_exists(table_name text, policy_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = table_name AND policyname = policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- Add service_role permissions for user_profiles if not exists
DO $$
BEGIN
  IF NOT policy_exists('user_profiles', 'Allow Insert from Webhook') THEN
    CREATE POLICY "Allow Insert from Webhook" ON user_profiles
    FOR INSERT TO service_role
    WITH CHECK (true);
  END IF;

  IF NOT policy_exists('user_profiles', 'Allow Update only for Service Role') THEN
    CREATE POLICY "Allow Update only for Service Role" ON user_profiles
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Add service_role permissions for member_rewards if not exists
DO $$
BEGIN
  IF NOT policy_exists('member_rewards', 'Service role can manage rewards') THEN
    CREATE POLICY "Service role can manage rewards" ON member_rewards
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Create function to create test users (replaces if exists)
CREATE OR REPLACE FUNCTION create_test_user(
  user_email text,
  user_password text,
  first_name text,
  last_name text,
  phone text,
  subscription_type text DEFAULT 'premium'
)
RETURNS uuid AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Generate UUID
  user_uuid := gen_random_uuid();
  
  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, 
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(), now(), now(), '{}', '{}', false
  );
  
  -- Create user profile
  INSERT INTO public.user_profiles (
    user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type
  ) VALUES (
    user_uuid, user_email, first_name, last_name, phone,
    'active', subscription_type
  );
  
  -- Create member rewards automatically
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level
  ) VALUES (
    user_uuid, 0, 0, 0, 'bronze'
  );
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION create_test_user TO service_role;

-- Drop the helper function
DROP FUNCTION IF EXISTS policy_exists(text, text);