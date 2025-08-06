/*
  # Create Safe User Functions

  1. Database Functions
    - `safe_list_users` - Liste les utilisateurs sans problème de confirmation_token
    - `safe_get_user_by_email` - Récupère un utilisateur par email de façon sécurisée

  2. Security
    - Functions avec SECURITY DEFINER pour accès auth.users
    - Gestion des valeurs NULL dans confirmation_token
*/

-- Create a database function to safely list users
CREATE OR REPLACE FUNCTION safe_list_users(
  p_page INT DEFAULT 1,
  p_per_page INT DEFAULT 50,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  user_metadata JSONB,
  app_metadata JSONB,
  is_confirmed BOOLEAN
) 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data::jsonb AS user_metadata,
    u.raw_app_meta_data::jsonb AS app_metadata,
    u.email_confirmed_at IS NOT NULL AS is_confirmed
  FROM 
    auth.users u
  WHERE
    (p_email IS NULL OR u.email = p_email)
  ORDER BY 
    u.created_at DESC
  LIMIT 
    p_per_page
  OFFSET 
    (p_page - 1) * p_per_page;
END;
$$;

-- Create a database function to safely get a user by email
CREATE OR REPLACE FUNCTION safe_get_user_by_email(
  p_email TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  user_metadata JSONB,
  app_metadata JSONB,
  is_confirmed BOOLEAN
) 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data::jsonb AS user_metadata,
    u.raw_app_meta_data::jsonb AS app_metadata,
    u.email_confirmed_at IS NOT NULL AS is_confirmed
  FROM 
    auth.users u
  WHERE
    u.email = p_email
  LIMIT 1;
END;
$$;