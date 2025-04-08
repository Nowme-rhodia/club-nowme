/*
  # Ajout d'un partenaire test pour Rhodia

  1. Création du profil partenaire pour l'utilisateur existant
    - Email: rhodia.kw@gmail.com
    - Nom de l'entreprise: Rhodia Studio
    - Contact: Rhodia KW
*/

DO $$ 
DECLARE
  user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur existant
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'rhodia.kw@gmail.com';

  -- Si l'utilisateur existe, créer son profil partenaire
  IF user_id IS NOT NULL THEN
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
      user_id,
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
    WHERE NOT EXISTS (
      SELECT 1 FROM partners WHERE user_id = user_id
    );
  END IF;
END $$;