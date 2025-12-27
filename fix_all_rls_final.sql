-- COMPREHENSIVE RLS FIX
-- Problem: Recursion loop between 'bookings' and 'user_profiles' policies.
-- Cause: 'bookings' policy queries 'user_profiles' directly, while 'user_profiles' policy queries 'bookings'.
-- Solution: Force BOTH to use the SECURITY DEFINER function `get_my_partner_id()`, breaking the chain.

-- 1. Helper Function (Ensure it is SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. CLEANUP user_profiles Policies
DROP POLICY IF EXISTS "Unified reading permissions" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their clients" ON user_profiles;

CREATE POLICY "Unified reading permissions"
ON user_profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id -- Case 1: Me
    OR 
    (
        -- Case 2: I am a partner (Function bypasses RLS to get ID)
        get_my_partner_id() IS NOT NULL AND
        EXISTS (
            SELECT 1 
            FROM bookings
            WHERE bookings.user_id = user_profiles.user_id
            AND bookings.partner_id = get_my_partner_id()
        )
    )
);

-- 3. CLEANUP bookings Policies
DROP POLICY IF EXISTS "Partners can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;

-- User visibility (Simple)
CREATE POLICY "Users can view own bookings"
ON bookings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Partner visibility (Use the SAFE FUNCTION instead of direct join)
CREATE POLICY "Partners can view their own bookings"
ON bookings
FOR SELECT
TO authenticated
USING (
    partner_id = get_my_partner_id() -- <--- THIS WAS THE MISSING LINK!
);
