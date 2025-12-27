-- FIX ABSOLUTE RECURSION (BOTH TABLES) - CORRECTED
-- The previous attempt failed because "user_profiles_insert_own" already existed.
-- This version explicitly DROPS EVERYTHING we intend to create.

-- 1. Helper Function (SECURITY DEFINER is Key)
DROP FUNCTION IF EXISTS get_my_partner_id() CASCADE;

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 2. NUKE ALL POLICIES on BOOKINGS
DROP POLICY IF EXISTS "Partners can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
-- Explicitly drop the new names we use below
DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;

-- 3. NUKE ALL POLICIES on USER_PROFILES
DROP POLICY IF EXISTS "Unified reading permissions" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their clients" ON user_profiles;
-- Explicitly drop the new names we use below (MISSING IN LAST VERSION)
DROP POLICY IF EXISTS "user_profiles_select_unified" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;

-- 4. REBUILD BOOKINGS POLICIES (Safe Versions)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select_own"
ON bookings FOR SELECT TO authenticated
USING (
  -- User can see own bookings
  auth.uid() = user_id
  OR
  -- Partner can see bookings for them (USING THE FUNCTION)
  partner_id = get_my_partner_id()
);

CREATE POLICY "bookings_insert_own"
ON bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. REBUILD USER_PROFILES POLICIES (Safe Versions)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_unified"
ON user_profiles FOR SELECT TO authenticated
USING (
  -- User can see own profile
  auth.uid() = user_id
  OR
  (
    -- Partner can see client profile (USING THE FUNCTION to avoid profiling recursion)
    get_my_partner_id() IS NOT NULL AND
    EXISTS (
       -- This query on bookings uses "bookings_select_own"
       -- "bookings_select_own" calls get_my_partner_id() (Safe)
       SELECT 1 
       FROM bookings
       WHERE bookings.user_id = user_profiles.user_id
       AND bookings.partner_id = get_my_partner_id()
    )
  )
);

CREATE POLICY "user_profiles_update_own"
ON user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert_own"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
