-- EMERGENCY SCRIPT
-- Drop the policy causing infinite recursion immediately
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;

-- Ensure the 'get_auth_partner_id' function is definitely Security Definer to bypass RLS in future
CREATE OR REPLACE FUNCTION get_auth_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Query user_profiles directly with admin privileges (Security Definer)
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;
