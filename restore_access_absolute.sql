-- RESTORE ACCESS ABSOLUTE (Hard Reset)
-- This script removes ALL variants of policies on user_profiles and bookings
-- and rebuilds the simplified, recursion-proof logic.

-- 1. Reset Helper Function (Force SECURITY DEFINER)
DROP FUNCTION IF EXISTS get_my_partner_id();

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. DROP ALL BOOKINGS POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Partners can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;

-- 3. DROP ALL USER_PROFILES POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Unified reading permissions" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_all" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their clients" ON user_profiles;
DROP POLICY IF EXISTS "Partner view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;

-- 4. REBUILD BOOKINGS POLICIES
-- User Access
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings"
ON bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Partner Access (Recursion-Proof via Function)
CREATE POLICY "Partners can view their own bookings"
ON bookings FOR SELECT TO authenticated
USING (partner_id = get_my_partner_id());

-- 5. REBUILD USER_PROFILES POLICIES
-- Read Access (Owner + Partner via Function)
CREATE POLICY "Unified reading permissions"
ON user_profiles FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
    OR
    (
        get_my_partner_id() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.user_id = user_profiles.user_id
            AND bookings.partner_id = get_my_partner_id()
        )
    )
);

-- Write Access (Owner Only)
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
