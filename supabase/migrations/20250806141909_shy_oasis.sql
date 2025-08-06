/*
  # Fix orphaned user profiles and test user creation

  1. Problem Analysis
    - Several user_profiles exist with user_id = null
    - This breaks the auth flow when trying to generate links
    - Need to clean up orphaned profiles and create working test user

  2. Solution
    - Delete orphaned profiles (user_id = null)
    - Create a clean test user that works
    - Verify the complete flow
*/

-- 1. Clean up orphaned profiles (user_id = null)
DELETE FROM user_profiles WHERE user_id IS NULL;

-- 2. Clean up any existing test-flow user completely
DELETE FROM member_rewards WHERE user_id IN (
  SELECT id FROM user_profiles WHERE email = 'test-flow@nowme.fr'
);
DELETE FROM user_profiles WHERE email = 'test-flow@nowme.fr';

-- 3. Delete auth user if exists
DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  -- Find auth user by email
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'test-flow@nowme.fr';
  
  IF auth_user_id IS NOT NULL THEN
    -- Delete from auth.users (this will cascade)
    DELETE FROM auth.users WHERE id = auth_user_id;
    RAISE NOTICE 'Deleted auth user: %', auth_user_id;
  END IF;
END $$;

-- 4. Create a completely clean test user
DO $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
BEGIN
  -- Generate UUID for the new user
  user_uuid := gen_random_uuid();

  -- Insert into auth.users table with proper password hash
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    'test-flow@nowme.fr',
    crypt('motdepasse123', gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user_uuid, 'test-flow@nowme.fr', 'Test', 'Flow',
    '+33612345678', 'active', 'premium', now(), now()
  )
  RETURNING id INTO profile_id;

  -- Insert into member_rewards
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level
  ) VALUES (
    profile_id, 0, 0, 0, 'bronze'
  );

  RAISE NOTICE 'SUCCESS: User created with auth ID: % and profile ID: %', user_uuid, profile_id;
END;
$$;

-- 5. Verify the creation worked
SELECT 
  'VERIFICATION' as status,
  u.id as auth_user_id,
  u.email as auth_email,
  p.id as profile_id,
  p.user_id as profile_user_id,
  p.subscription_status,
  r.id as rewards_id
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
LEFT JOIN member_rewards r ON p.id = r.user_id
WHERE u.email = 'test-flow@nowme.fr';