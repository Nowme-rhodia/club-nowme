/*
  # Remove member_rewards temporarily and fix user creation

  1. Remove Dependencies
    - Drop triggers that depend on member_rewards functions
    - Drop functions related to member_rewards
    - Drop foreign key constraints

  2. Cleanup
    - Remove all test data completely
    - Clean up orphaned records

  3. Create Simple Test User
    - Create working test user without member_rewards
*/

-- 1. DROP TRIGGERS FIRST (they depend on functions)
DROP TRIGGER IF EXISTS create_member_rewards_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_member_rewards_simple_trigger ON user_profiles;
DROP TRIGGER IF EXISTS create_member_rewards_backup_trigger ON user_profiles;

-- 2. DROP FUNCTIONS
DROP FUNCTION IF EXISTS create_member_rewards() CASCADE;
DROP FUNCTION IF EXISTS create_member_rewards_simple() CASCADE;
DROP FUNCTION IF EXISTS create_member_rewards_backup() CASCADE;

-- 3. DROP FOREIGN KEY CONSTRAINTS TO member_rewards
ALTER TABLE member_rewards DROP CONSTRAINT IF EXISTS fk_member_rewards_user CASCADE;

-- 4. COMPLETE CLEANUP OF TEST DATA
-- Delete from auth.users first (this will cascade to user_profiles if FK exists)
DELETE FROM auth.users WHERE email LIKE '%test%';

-- Delete any remaining user_profiles
DELETE FROM user_profiles WHERE email LIKE '%test%';

-- Delete any remaining member_rewards
DELETE FROM member_rewards WHERE user_id IN (
  SELECT id FROM user_profiles WHERE email LIKE '%test%'
);

-- Delete test emails
DELETE FROM emails WHERE to_address LIKE '%test%';

-- Delete test webhook events
DELETE FROM stripe_webhook_events WHERE customer_email LIKE '%test%';

-- 5. CREATE SIMPLE TEST USER (without member_rewards)
DO $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
BEGIN
  -- Generate UUIDs
  user_uuid := gen_random_uuid();
  profile_id := gen_random_uuid();

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

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    profile_id, user_uuid, 'test-simple@nowme.fr', 'Test', 'Simple',
    '+33612345680', 'active', 'premium', now(), now()
  );

  RAISE NOTICE 'User created successfully:';
  RAISE NOTICE '  Auth ID: %', user_uuid;
  RAISE NOTICE '  Profile ID: %', profile_id;
  RAISE NOTICE '  Email: test-simple@nowme.fr';
  RAISE NOTICE '  Password: motdepasse123';
END;
$$;

-- 6. RE-ENABLE RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 7. VERIFY CREATION
SELECT 
  'auth.users' as source, 
  id, 
  email, 
  created_at 
FROM auth.users 
WHERE email = 'test-simple@nowme.fr'
UNION ALL
SELECT 
  'user_profiles' as source, 
  user_id::text as id, 
  email, 
  created_at 
FROM user_profiles 
WHERE email = 'test-simple@nowme.fr';