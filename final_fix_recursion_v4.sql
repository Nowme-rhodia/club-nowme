-- FINAL FIX RECURSION V4 (RETURN TO USER_PROFILES + DYNAMIC CLEANUP)
-- V3 failed because 'partners.user_id' does not exist. The link IS 'user_profiles.partner_id'.
-- We revert to using 'user_profiles' but ensuring the SECURITY DEFINER works perfectly.

-- 1. DYNAMICALLY DROP ALL POLICIES (Must be robust)
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

-- 2. RECREATE HELPER FUNCTION (PLPGSQL + SECURITY DEFINER)
-- We use PLPGSQL for better control, though SQL is fine.
-- SECURITY DEFINER is CRITICAL: it creates a "superuser tunnel" to read the ID without triggering RLS.
DROP FUNCTION IF EXISTS get_my_partner_id() CASCADE;

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  pid uuid;
BEGIN
  -- We select directly. Because of SECURITY DEFINER, this ignores "Unified reading permissions" on user_profiles.
  -- This BREAKS the recursion loop.
  SELECT partner_id INTO pid FROM user_profiles WHERE user_id = auth.uid();
  RETURN pid;
END;
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
    -- Validation: "Am I a partner?" via function (Safe)
    get_my_partner_id() IS NOT NULL AND
    EXISTS (
       -- Validation: "Do I have a booking with this user?"
       -- This queries 'bookings'. 'bookings' queries 'get_my_partner_id'.
       -- 'get_my_partner_id' queries 'user_profiles' (Safe via Sec Def).
       -- Loop is closed.
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
  RAISE NOTICE 'V4 Fix applied: Dynamic cleanup + Secure Function + Valid Foreign Key Path';
END $$;
