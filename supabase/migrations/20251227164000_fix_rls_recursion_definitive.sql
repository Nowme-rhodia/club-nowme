-- 1. DROP the problematic policy immediately
-- This stops the infinite recursion loop.
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;

-- 2. Create/Replace the helper function to be SECURE
-- SECURITY DEFINER = Runs as database owner (admin), skipping RLS checks.
-- This allows us to get the partner_id without asking "Do I have permission?" (which caused the loop).
CREATE OR REPLACE FUNCTION get_auth_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 3. Re-create the policy using the SAFE function
CREATE POLICY "Partners can view profiles of their bookings"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Check if the user trying to view a profile has a booking ref referencing them
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.user_id = user_profiles.user_id
    -- AND the booking was made with MY partner account (retrieved safely)
    AND bookings.partner_id = get_auth_partner_id()
  )
);
