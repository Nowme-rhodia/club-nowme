-- 1. Create the secure function to get partner_id from user_profiles
-- SECURITY DEFINER ensures this runs with owner privileges (bypassing RLS)
CREATE OR REPLACE FUNCTION get_auth_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. Drop any previous attempts at this policy
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;

-- 3. Create the policy using the secure function
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
