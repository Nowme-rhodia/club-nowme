-- EMERGENCY FIX RECURSION
-- Priority: BREAK THE LOOP.
-- Strategy: Ensure function is SECURITY DEFINER and clean up all read policies.

-- 1. DROP FUNCTION FIRST (to ensure clean recreate)
DROP FUNCTION IF EXISTS get_my_partner_id() CASCADE;

-- 2. RECREATE With SECURITY DEFINER (Crucial for bypassing RLS on user_profiles lookup)
CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- <--- THIS ATTRIBUTE STOPS THE RECURSION
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 3. DROP ALL READ POLICIES on user_profiles (Clean duplicate/legacy policies)
DROP POLICY IF EXISTS "Unified reading permissions" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their clients" ON user_profiles;
DROP POLICY IF EXISTS "Partner view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Any legacy read policy" ON user_profiles;

-- 4. APPLY SINGLE READ POLICY
CREATE POLICY "Unified reading permissions"
ON user_profiles
FOR SELECT
TO authenticated
USING (
    -- Condition 1: It's me
    auth.uid() = user_id
    
    OR
    
    -- Condition 2: Partner looking at client
    -- The function get_my_partner_id() runs as SUPERUSER (Security Definer),
    -- so it DOES NOT trigger RLS when reading user_profiles. Loop broken.
    (
        get_my_partner_id() IS NOT NULL AND
        EXISTS (
            SELECT 1 
            FROM bookings
            WHERE bookings.user_id = user_profiles.user_id
            AND bookings.partner_id = get_my_partner_id()
        )
    )
);

-- 5. ENSURE WRITES ARE SAFE (Just in case)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;

CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
