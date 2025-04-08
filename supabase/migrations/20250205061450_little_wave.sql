DO $$ 
DECLARE
  new_user_id uuid;
BEGIN
  -- Supprimer d'abord le profil partenaire s'il existe
  DELETE FROM partners
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'rhodia.kw@gmail.com'
  );

  -- Ensuite supprimer l'utilisateur
  DELETE FROM auth.users WHERE email = 'rhodia.kw@gmail.com';

  -- Créer l'utilisateur avec un mot de passe plus complexe
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    phone,
    phone_confirmed_at,
    phone_change_token,
    phone_change
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'rhodia.kw@gmail.com',
    crypt('Password123!@#', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    '{}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    null,
    null,
    encode(gen_random_bytes(32), 'hex'),
    null
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