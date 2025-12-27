-- NUCLEAR OPTION V2: RESTORE LOGIN ONLY (With CASCADE)
-- This script force-removes dependencies to guarantee clean slate.

-- 1. Drop the function and EVERYTHING that relies on it (policies)
DROP FUNCTION IF EXISTS get_auth_partner_id() CASCADE;

-- 2. Drop any lingering policies on user_profiles just in case
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- 3. Create the ONE and ONLY safe policy for now
-- Simple owner check. No joins. No subqueries.
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
