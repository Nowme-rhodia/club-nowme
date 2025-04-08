/*
  # Ajout d'un partenaire test

  1. Création d'un utilisateur test
    - Email: partner@test.com
    - Mot de passe: password123

  2. Création du profil partenaire
    - Nom de l'entreprise: Studio Zen
    - Contact: Marie Dubois
    - Description: Studio de yoga et bien-être
    - Localisation: Paris 11e
*/

DO $$ 
DECLARE
  new_user_id uuid;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'partner@test.com';

  -- Si l'utilisateur n'existe pas, le créer
  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      raw_user_meta_data,
      raw_app_meta_data,
      aud,
      role
    ) VALUES (
      gen_random_uuid(),
      'partner@test.com',
      '{}',
      '{"provider": "email", "providers": ["email"]}',
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO new_user_id;
  END IF;

  -- Créer le profil partenaire s'il n'existe pas déjà
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
  SELECT
    new_user_id,
    'Studio Zen',
    'Marie Dubois',
    '+33601020304',
    'https://studiozenparis.fr',
    'Studio de yoga et bien-être au cœur de Paris. Cours collectifs et particuliers, massages et méditation.',
    '123 rue du Temple, 75011 Paris',
    point(48.8566, 2.3522),
    '{"instagram": "studiozenparis", "facebook": "studiozenparis"}'::jsonb,
    '{
      "monday": {"open": "09:00", "close": "20:00"},
      "tuesday": {"open": "09:00", "close": "20:00"},
      "wednesday": {"open": "09:00", "close": "20:00"},
      "thursday": {"open": "09:00", "close": "20:00"},
      "friday": {"open": "09:00", "close": "19:00"},
      "saturday": {"open": "10:00", "close": "17:00"},
      "sunday": {"open": null, "close": null}
    }'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM partners WHERE user_id = new_user_id
  );
END $$;