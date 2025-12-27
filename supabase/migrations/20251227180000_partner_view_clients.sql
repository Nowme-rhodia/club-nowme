-- Migration: Allow partners to view profiles of their clients securely (RECURSION PROOF)
-- Description: Uses a SECURITY DEFINER function to lookup partner_id, bypassing RLS recursion.

-- 1. Helper function to get current user's partner ID efficiently and safely
-- security definer allows it to read user_profiles without triggering the user_profiles RLS policy recursively
CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. Policy using the safe function
DROP POLICY IF EXISTS "Partners can view profiles of their clients" ON user_profiles;

CREATE POLICY "Partners can view profiles of their clients"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- User is a partner (has a partner_id) AND there is a booking for this user with that partner
  get_my_partner_id() IS NOT NULL AND
  EXISTS (
    SELECT 1 
    FROM bookings
    WHERE bookings.user_id = user_profiles.user_id
    AND bookings.partner_id = get_my_partner_id()
  )
);
