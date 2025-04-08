DO $$ 
DECLARE
  new_user_id uuid;
BEGIN
  -- Supprimer l'utilisateur s'il existe déjà pour éviter les conflits
  DELETE FROM auth.users WHERE email = 'rhodia.kw@gmail.com';

  -- Créer l'utilisateur avec un mot de passe crypté
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
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'rhodia.kw@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO new_user_id;

  -- Créer le profil partenaire
  INSERT INTO partners (
    user_id,
    business_name,
    contact_name,
    phone,
    website,
    description,
    address,
    coordinates,
    social_media,
    opening_hours
  ) 
  VALUES (
    new_user_id,
    'Rhodia Studio',
    'Rhodia KW',
    '+33600000000',
    'https://rhodiastudio.fr',
    'Studio créatif et espace bien-être au cœur de Paris.',
    '15 rue de la Paix, 75002 Paris',
    point(48.8691, 2.3322),
    '{"instagram": "rhodiastudio", "facebook": "rhodiastudio"}'::jsonb,
    '{
      "monday": {"open": "09:00", "close": "19:00"},
      "tuesday": {"open": "09:00", "close": "19:00"},
      "wednesday": {"open": "09:00", "close": "19:00"},
      "thursday": {"open": "09:00", "close": "19:00"},
      "friday": {"open": "09:00", "close": "18:00"},
      "saturday": {"open": "10:00", "close": "16:00"},
      "sunday": {"open": null, "close": null}
    }'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;