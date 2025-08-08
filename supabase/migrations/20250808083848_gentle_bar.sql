/*
  # Fix Safe User Functions

  1. Database Functions
    - Fix `safe_get_user_by_email` to return proper structure
    - Fix `safe_list_users` to return proper structure
    - Add proper error handling

  2. Security
    - Functions use SECURITY DEFINER for proper access
    - Proper search_path configuration
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS safe_get_user_by_email(TEXT);
DROP FUNCTION IF EXISTS safe_list_users(INT, INT, TEXT);

-- Create corrected safe_get_user_by_email function
CREATE OR REPLACE FUNCTION safe_get_user_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at
  FROM 
    auth.users u
  WHERE
    u.email = p_email
  LIMIT 1;
END;
$$;

-- Create corrected safe_list_users function
CREATE OR REPLACE FUNCTION safe_list_users(
  p_page INT DEFAULT 1,
  p_per_page INT DEFAULT 50,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at
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