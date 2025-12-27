-- FINAL FIX RECURSION V2 (DYNAMIC NUKE)
-- This script uses dynamic SQL to drop ALL policies on 'user_profiles' and 'bookings'
-- regardless of their names. This avoids "policy already exists" or "policy not found" errors.

-- 1. DYNAMICALLY DROP ALL POLICIES
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on user_profiles
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_profiles';
        RAISE NOTICE 'Dropped policy: % on user_profiles', r.policyname;
    END LOOP;

    -- Drop all policies on bookings
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'bookings' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.bookings';
        RAISE NOTICE 'Dropped policy: % on bookings', r.policyname;
    END LOOP;
END $$;

-- 2. RECREATE HELPER FUNCTION (SECURITY DEFINER)
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

-- 3. REBUILD BOOKINGS POLICIES
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select_own"
ON bookings FOR SELECT TO authenticated
USING (
  -- User can see own bookings
  auth.uid() = user_id
  OR
  -- Partner can see bookings for them
  partner_id = get_my_partner_id()
);

CREATE POLICY "bookings_insert_own"
ON bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. REBUILD USER_PROFILES POLICIES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_unified"
ON user_profiles FOR SELECT TO authenticated
USING (
  -- Case 1: Viewing own profile
  auth.uid() = user_id
  OR
  (
    -- Case 2: Partner viewing client profile
    -- Uses get_my_partner_id() (SECURITY DEFINER) -> Safe read of user_profiles
    get_my_partner_id() IS NOT NULL AND
    EXISTS (
       -- Uses "bookings_select_own" -> Safe read of bookings
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

-- 5. VERIFY
DO $$
BEGIN
  RAISE NOTICE 'Cleanup and rebuild completed successfully.';
END $$;
