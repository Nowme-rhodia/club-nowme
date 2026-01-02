-- 1. Create a secure function to get the current user's partner_id
-- This function runs with "SECURITY DEFINER" privileges, bypassing RLS to avoid recursion.
CREATE OR REPLACE FUNCTION get_auth_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. Create the safe policy for partners to view client profiles
-- We use the secure function instead of querying user_profiles directly in the policy
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;
CREATE POLICY "Partners can view profiles of their bookings"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.user_id = user_profiles.user_id
    AND bookings.partner_id = get_auth_partner_id()
  )
);
