-- 1. Redefine the function to query 'partners' table directly (avoiding user_profiles recursion)
CREATE OR REPLACE FUNCTION get_auth_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Fallback to using user_profiles since partners.user_id might not exist
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. Re-apply the policy using the safe function
-- Drop first to be sure
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
