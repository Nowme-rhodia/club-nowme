DO $$ 
DECLARE
  user1_id uuid := gen_random_uuid();
  user2_id uuid := gen_random_uuid();
  user3_id uuid := gen_random_uuid();
BEGIN
  -- Création des utilisateurs dans auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES
  (
    user1_id,
    '00000000-0000-0000-0000-000000000000',
    'test1@nowme.fr',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    user2_id,
    '00000000-0000-0000-0000-000000000000',
    'test2@nowme.fr',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    user3_id,
    '00000000-0000-0000-0000-000000000000',
    'test3@nowme.fr',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

  -- Création des profils utilisateurs
  INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    phone,
    subscription_status
  ) VALUES
  (
    user1_id,
    'Alice',
    'Martin',
    '+33601020304',
    'active'
  ),
  (
    user2_id,
    'Sophie',
    'Dubois',
    '+33605060708',
    'pending'
  ),
  (
    user3_id,
    'Emma',
    'Bernard',
    '+33609101112',
    'active'
  );

  -- Génération des QR codes
  INSERT INTO user_qr_codes (
    user_profile_id,
    qr_code
  )
  SELECT 
    id,
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  FROM user_profiles
  WHERE user_id IN (user1_id, user2_id, user3_id);

END $$;