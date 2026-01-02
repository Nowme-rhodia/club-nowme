-- Fix recursion by using security definer function in bookings policy

-- 1. Ensure the helper function exists (just in case)
CREATE OR REPLACE FUNCTION get_my_partner_id_secure()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. Update bookings policy to use the secure function
-- This avoids triggering user_profiles RLS when querying bookings
DROP POLICY IF EXISTS "Partners can view their own bookings" ON bookings;

CREATE POLICY "Partners can view their own bookings" 
ON bookings FOR SELECT 
TO authenticated
USING (
    partner_id = get_my_partner_id_secure()
);
