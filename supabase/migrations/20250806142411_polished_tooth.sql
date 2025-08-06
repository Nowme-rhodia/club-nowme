/*
  # Clean and recreate test user completely

  1. Clean up
    - Delete all existing test users from auth.users
    - Delete all orphaned profiles
    - Remove any conflicting data

  2. Create fresh test user
    - Create auth.users entry with proper password
    - Create user_profiles entry with correct linking
    - Create member_rewards entry
    - Verify everything works
*/

-- Step 1: Clean up ALL test users completely
DO $$
DECLARE
  test_user_id uuid;
  test_profile_id uuid;
BEGIN
  -- Delete from auth.users (this will cascade to profiles if FK exists)
  DELETE FROM auth.users WHERE email IN (
    'test-flow@nowme.fr', 
    'test-temp@example.com',
    'test-auto@nowme.fr'
  );
  
  -- Delete any orphaned profiles
  DELETE FROM public.user_profiles WHERE email IN (
    'test-flow@nowme.fr', 
    'test-temp@example.com',
    'test-auto@nowme.fr'
  );
  
  -- Delete any orphaned member_rewards
  DELETE FROM public.member_rewards WHERE user_id NOT IN (
    SELECT id FROM public.user_profiles
  );
  
  RAISE NOTICE 'Cleanup completed - all test users removed';
END;
$$;

-- Step 2: Create fresh test user with proper linking
DO $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
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

  RAISE NOTICE 'SUCCESS: Fresh user created - Auth ID: %, Profile ID: %', user_uuid, profile_id;
  RAISE NOTICE 'LOGIN: Email=test-flow@nowme.fr, Password=motdepasse123';
END;
$$;

-- Step 3: Verify everything is properly linked
SELECT 
  'VERIFICATION' as status,
  up.email,
  up.user_id as profile_user_id,
  au.id as auth_user_id,
  up.subscription_status,
  up.subscription_type,
  CASE 
    WHEN up.user_id = au.id THEN 'LINKED_CORRECTLY'
    ELSE 'LINK_ERROR'
  END as link_status
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.email = 'test-flow@nowme.fr';