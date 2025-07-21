/*
  # Fonction de création d'utilisateur test qui fonctionne

  1. Nouvelle fonction
    - Crée un utilisateur auth avec mot de passe
    - Crée le profil utilisateur correspondant
    - Crée automatiquement les récompenses
    - Gère les UUID correctement

  2. Sécurité
    - Utilise les bonnes tables et colonnes
    - Génère des UUID uniques
    - Confirme l'email automatiquement
*/

-- Fonction de création d'utilisateur test qui fonctionne
CREATE OR REPLACE FUNCTION create_working_test_user(
  user_email text,
  user_password text,
  first_name text DEFAULT 'Test',
  last_name text DEFAULT 'User',
  phone text DEFAULT '+33612345678',
  sub_type text DEFAULT 'premium'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user_uuid, user_email, first_name, last_name, phone,
    'active', sub_type, now(), now()
  )
  RETURNING id INTO profile_id;

  -- Insert into member_rewards if needed
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level
  ) VALUES (
    profile_id, 0, 0, 0, 'bronze'
  );

  RETURN 'User created successfully with ID: ' || user_uuid || ', Profile ID: ' || profile_id;
EXCEPTION
  WHEN unique_violation THEN
    RETURN 'User with email ' || user_email || ' already exists';
  WHEN OTHERS THEN
    RETURN 'Error creating user: ' || SQLERRM;
END;
$$;