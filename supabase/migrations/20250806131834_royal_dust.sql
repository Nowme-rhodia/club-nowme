/*
  # Fix duplicate user constraint error

  1. Problem
    - User exists in auth.users but profile creation fails due to duplicate user_id
    - Function needs to handle existing users gracefully

  2. Solution
    - Update function to check for existing profiles
    - Use UPSERT instead of INSERT for profiles
    - Clean up any orphaned data first
*/

-- First, clean up any potential orphaned data
DELETE FROM member_rewards 
WHERE user_id IN (
  SELECT id FROM user_profiles 
  WHERE email = 'test-auto@nowme.fr'
);

DELETE FROM user_profiles 
WHERE email = 'test-auto@nowme.fr';

-- Now recreate the function with proper conflict handling
CREATE OR REPLACE FUNCTION create_working_test_user(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_subscription_type text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO existing_user_id
  FROM auth.users 
  WHERE email = p_email;
  
  IF existing_user_id IS NOT NULL THEN
    -- User exists, delete their profile if any
    DELETE FROM member_rewards 
    WHERE user_id IN (
      SELECT id FROM user_profiles 
      WHERE user_id = existing_user_id
    );
    
    DELETE FROM user_profiles 
    WHERE user_id = existing_user_id;
    
    -- Delete the auth user to start fresh
    DELETE FROM auth.users WHERE id = existing_user_id;
    
    RAISE NOTICE 'Cleaned up existing user: %', existing_user_id;
  END IF;

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
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user_uuid, p_email, p_first_name, p_last_name,
    p_phone, 'active', p_subscription_type, now(), now()
  )
  RETURNING id INTO profile_id;

  -- Insert into member_rewards (using profile_id, not user_uuid)
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level
  ) VALUES (
    profile_id, 0, 0, 0, 'bronze'
  );

  RAISE NOTICE 'User created successfully: auth_id=%, profile_id=%', user_uuid, profile_id;
  
  RETURN 'SUCCESS: User ' || p_email || ' created with auth_id=' || user_uuid || ' and profile_id=' || profile_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user: %', SQLERRM;
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;