-- 1. Create the helper function as SECURITY DEFINER
-- This bypasses RLS on user_profiles to safely get the partner_id
CREATE OR REPLACE FUNCTION get_auth_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. Create the policy for Partners to view client profiles
-- This uses the helper function to avoid recursion
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
