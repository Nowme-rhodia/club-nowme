-- GRAND UNIFIED FIX for RLS Recursion and Permissions
-- This migration resets security for user_profiles and partners to a clean state.

-- ==============================================================================
-- 1. SECURE HELPER FUNCTIONS (Prevent Recursion)
-- ==============================================================================

-- 1.1 Securely check if current user is admin
CREATE OR REPLACE FUNCTION is_admin_secure()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Runs as DB owner to bypass RLS
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 1.2 Securely get current user's partner_id
CREATE OR REPLACE FUNCTION get_my_partner_id_secure()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 1.3 Securely get list of client IDs for the current partner (if they are one)
-- This allows partners to view profiles of users who have booked them, without touching bookings RLS
CREATE OR REPLACE FUNCTION get_my_clients_secure()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.user_id
  FROM bookings b
  WHERE b.partner_id = (SELECT partner_id FROM user_profiles WHERE user_id = auth.uid());
$$;

-- ==============================================================================
-- 2. USER PROFILES POLICIES
-- ==============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL known potential policies to ensure a clean slate
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
-- Fix: Drop policies that caused conflicts or are being re-created
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view client profiles" ON user_profiles;


-- 2.1 Owner Access
CREATE POLICY "Users can manage own profile"
ON user_profiles
FOR ALL
TO authenticated
USING ( user_id = auth.uid() );

-- 2.2 Admin View All
CREATE POLICY "Admins can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING ( is_admin_secure() );

-- 2.3 Admin Update All
CREATE POLICY "Admins can update all profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING ( is_admin_secure() );

-- 2.4 Partner View Clients
CREATE POLICY "Partners can view client profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING ( user_id IN (SELECT get_my_clients_secure()) );


-- ==============================================================================
-- 3. PARTNERS TABLE POLICIES
-- ==============================================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Drop ALL known policies
DROP POLICY IF EXISTS "Partners view own" ON partners;
DROP POLICY IF EXISTS "Admins manage partners" ON partners;
DROP POLICY IF EXISTS "Public view approved partners" ON partners;
DROP POLICY IF EXISTS "Partners can view own data" ON partners;
DROP POLICY IF EXISTS "Enable read access for all users" ON partners;
-- Fix: Drop policies being re-created
DROP POLICY IF EXISTS "Partners manage own data" ON partners;

-- 3.1 Admin Manage All
CREATE POLICY "Admins manage partners"
ON partners
FOR ALL
TO authenticated
USING ( is_admin_secure() );

-- 3.2 Partners Manage Own
CREATE POLICY "Partners manage own data"
ON partners
FOR ALL
TO authenticated
USING ( id = get_my_partner_id_secure() );

-- 3.3 Public View Approved
CREATE POLICY "Public view approved partners"
ON partners
FOR SELECT
TO public
USING ( status = 'approved' );
