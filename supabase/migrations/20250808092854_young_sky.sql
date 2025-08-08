/*
  # Remove member_rewards temporarily - Fixed order

  1. Drop triggers first (they depend on functions)
  2. Drop functions 
  3. Drop constraints
  4. Clean data
  5. Create simple test user
*/

-- 1. DROP TRIGGERS FIRST (they depend on functions)
DROP TRIGGER IF EXISTS create_member_rewards_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_member_rewards_simple_trigger ON user_profiles;
DROP TRIGGER IF EXISTS create_member_rewards_backup_trigger ON user_profiles;

-- 2. DROP FUNCTIONS (now safe to drop)
DROP FUNCTION IF EXISTS create_member_rewards() CASCADE;
DROP FUNCTION IF EXISTS create_member_rewards_simple() CASCADE;
DROP FUNCTION IF EXISTS create_member_rewards_backup() CASCADE;

-- 3. DROP FOREIGN KEY CONSTRAINTS from member_rewards
ALTER TABLE IF EXISTS member_rewards DROP CONSTRAINT IF EXISTS fk_member_rewards_user CASCADE;
ALTER TABLE IF EXISTS member_rewards DROP CONSTRAINT IF EXISTS member_rewards_user_id_fkey CASCADE;

-- 4. TEMPORARILY DISABLE RLS to clean data
ALTER TABLE member_rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 5. CLEAN ALL TEST DATA
DELETE FROM member_rewards WHERE user_id IN (
  SELECT id FROM user_profiles WHERE email LIKE '%test%'
);

DELETE FROM user_profiles WHERE email LIKE '%test%';

-- Delete test users from auth.users
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

-- 6. RE-ENABLE RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_rewards ENABLE ROW LEVEL SECURITY;

-- 7. CREATE SIMPLE TEST USER (without member_rewards)
DO $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
BEGIN
  -- Generate UUID for the new user
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

  -- Insert into user_profiles table (NO member_rewards creation)
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    profile_id, user_uuid, 'test-simple@nowme.fr', 'Test', 'Simple',
    '+33612345680', 'active', 'premium', now(), now()
  );

  RAISE NOTICE 'Simple test user created - Email: test-simple@nowme.fr, Password: motdepasse123';
  RAISE NOTICE 'User ID: %, Profile ID: %', user_uuid, profile_id;
END;
$$;