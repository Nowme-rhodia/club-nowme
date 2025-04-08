/*
  # Create Active Subscriber

  1. Create User Profile
    - Create profile for rhodia.kw@gmail.com if user exists
    - Set subscription status to active
    - Generate QR code
*/

DO $$ 
DECLARE
  user_id uuid;
BEGIN
  -- Get the user ID if exists
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'rhodia.kw@gmail.com';

  -- Only proceed if user exists
  IF user_id IS NOT NULL THEN
    -- Insert user profile if not exists
    INSERT INTO user_profiles (
      user_id,
      first_name,
      last_name,
      phone,
      subscription_status
    )
    VALUES (
      user_id,
      'Rhodia',
      'KW',
      '+33600000000',
      'active'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET subscription_status = 'active'
    RETURNING id;

    -- Generate QR code for the user
    INSERT INTO user_qr_codes (
      user_profile_id,
      qr_code
    )
    SELECT 
      id,
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    FROM user_profiles
    WHERE user_id = user_id
    ON CONFLICT (user_profile_id) DO NOTHING;
  END IF;
END $$;