/*
  # Corriger la fonction create_test_user pour gérer les doublons

  1. Modifications
    - Vérifier si le profil existe déjà avant de l'insérer
    - Mettre à jour le profil existant si nécessaire
    - Gérer les cas où l'utilisateur auth existe mais pas le profil
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS create_test_user(text, text, text, text, text, text);

-- Créer la nouvelle fonction améliorée
CREATE OR REPLACE FUNCTION create_test_user(
  user_email text,
  user_password text,
  first_name text,
  last_name text,
  phone text,
  sub_type text DEFAULT 'premium'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
  existing_profile_id uuid;
BEGIN
  -- Vérifier si l'utilisateur auth existe déjà
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = user_email;
  
  -- Si l'utilisateur n'existe pas, le créer
  IF user_uuid IS NULL THEN
    user_uuid := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, 
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_uuid, 'authenticated', 'authenticated',
      user_email, crypt(user_password, gen_salt('bf')),
      now(), now(), now(), '{}', '{}', false
    );
    
    RAISE NOTICE 'Utilisateur auth créé avec ID: %', user_uuid;
  ELSE
    RAISE NOTICE 'Utilisateur auth existe déjà avec ID: %', user_uuid;
  END IF;
  
  -- Vérifier si le profil existe déjà
  SELECT id INTO existing_profile_id 
  FROM user_profiles 
  WHERE user_id = user_uuid;
  
  -- Si le profil n'existe pas, le créer
  IF existing_profile_id IS NULL THEN
    INSERT INTO user_profiles (
      user_id, email, first_name, last_name, phone,
      subscription_status, subscription_type
    ) VALUES (
      user_uuid, user_email, first_name, last_name, phone,
      'active', sub_type
    );
    
    RAISE NOTICE 'Profil utilisateur créé';
  ELSE
    -- Mettre à jour le profil existant
    UPDATE user_profiles SET
      email = user_email,
      first_name = first_name,
      last_name = last_name,
      phone = phone,
      subscription_status = 'active',
      subscription_type = sub_type,
      updated_at = now()
    WHERE id = existing_profile_id;
    
    RAISE NOTICE 'Profil utilisateur mis à jour';
  END IF;
  
  -- Vérifier/créer les récompenses
  IF NOT EXISTS (SELECT 1 FROM member_rewards WHERE user_id = existing_profile_id OR user_id = (SELECT id FROM user_profiles WHERE user_id = user_uuid)) THEN
    INSERT INTO member_rewards (user_id, points_earned, points_spent, points_balance, tier_level)
    VALUES ((SELECT id FROM user_profiles WHERE user_id = user_uuid), 0, 0, 0, 'bronze');
    
    RAISE NOTICE 'Récompenses créées';
  ELSE
    RAISE NOTICE 'Récompenses existent déjà';
  END IF;
  
  RETURN 'Utilisateur créé/mis à jour avec succès: ' || user_email;
END;
$$;