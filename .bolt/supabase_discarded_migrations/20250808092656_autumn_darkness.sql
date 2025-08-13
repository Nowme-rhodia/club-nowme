/*
  # Remove member_rewards from user creation flow temporarily

  1. Drop Foreign Keys
    - Remove all FK constraints that reference member_rewards
    - This will prevent cascade errors

  2. Disable Triggers
    - Disable any triggers that try to create member_rewards automatically

  3. Clean Test Data
    - Remove all test data to start fresh
*/

-- Drop foreign key constraints that reference member_rewards
ALTER TABLE member_rewards DROP CONSTRAINT IF EXISTS fk_member_rewards_user;
ALTER TABLE member_rewards DROP CONSTRAINT IF EXISTS member_rewards_user_id_fkey;

-- Drop triggers that auto-create member_rewards
DROP TRIGGER IF EXISTS create_member_rewards_trigger ON user_profiles;
DROP TRIGGER IF EXISTS create_member_rewards_simple_trigger ON user_profiles;
DROP TRIGGER IF EXISTS create_member_rewards_backup_trigger ON user_profiles;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS create_member_rewards();
DROP FUNCTION IF EXISTS create_member_rewards_simple();
DROP FUNCTION IF EXISTS create_member_rewards_backup();

-- Clean up ALL test data
DELETE FROM member_rewards WHERE user_id IN (
  SELECT id FROM user_profiles WHERE email LIKE '%test%'
);

DELETE FROM user_profiles WHERE email LIKE '%test%';

-- Clean auth.users test data
DO $$
DECLARE
  test_user_record RECORD;
BEGIN
  FOR test_user_record IN 
    SELECT id FROM auth.users WHERE email LIKE '%test%'
  LOOP
    DELETE FROM auth.users WHERE id = test_user_record.id;
  END LOOP;
END $$;

-- Clean webhook events
DELETE FROM stripe_webhook_events WHERE customer_email LIKE '%test%';

-- Clean emails
DELETE FROM emails WHERE to_address LIKE '%test%';

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple test user WITHOUT member_rewards
DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Generate UUID for the new user
  user_uuid := gen_random_uuid();

  -- Insert into auth.users table
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    'test-simple@nowme.fr',
    crypt('motdepasse123', gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  -- Insert into user_profiles table (NO member_rewards)
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user_uuid, 'test-simple@nowme.fr', 'Test', 'Simple',
    '+33612345678', 'active', 'premium', now(), now()
  );

  RAISE NOTICE 'SUCCESS: Simple user created without member_rewards';
  RAISE NOTICE 'LOGIN: Email=test-simple@nowme.fr, Password=motdepasse123';
END;
$$;