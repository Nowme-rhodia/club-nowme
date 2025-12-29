-- Create a secure function to look up user ID by email
-- This bypasses the Auth API 'listUsers' which is currently failing

CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth -- CRITICAL: access auth schema
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid
  FROM auth.users
  WHERE email = user_email;
  
  RETURN uid; -- Returns NULL if not found
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_id_by_email TO service_role;
-- Optional: Grant to authenticated/anon if needed, but safer to keep to service_role for now
-- GRANT EXECUTE ON FUNCTION get_user_id_by_email TO authenticated;
