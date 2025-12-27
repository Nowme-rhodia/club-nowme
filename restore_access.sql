-- FINAL CORRECTED EMERGENCY ACCESS RESTORATION
-- 1. Drop ALL potential policies on user_profiles to be safe
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their bookings " ON user_profiles; -- Handle potential improved spacing typos
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles; -- Correct name
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- 2. Restore the original, safe policy for user_profiles
-- Only allow users to see/edit their OWN profile.
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

-- 3. Ensure partners table RLS is safe
-- Partners should be viewable if you are the owner
DROP POLICY IF EXISTS "Partners view own data" ON partners;
CREATE POLICY "Partners view own data"
ON partners
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
