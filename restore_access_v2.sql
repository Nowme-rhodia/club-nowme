-- RESTORE ACCESS V2 (Simplified)
-- Focused ONLY on user_profiles to unblock login immediately.
-- Ignoring partners table for now to avoid field errors.

-- 1. Drop ALL potential policies on user_profiles
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their bookings " ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- 2. Restore the SAFE policy for user_profiles
-- This allows you to log in.
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
