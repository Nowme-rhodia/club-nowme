-- Fix for infinite recursion in "Admins can view all profiles" policy
-- The previous policy queried user_profiles (is_admin) to check access to user_profiles, causing a loop.

-- 1. Create a secure function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Runs as database owner, bypassing RLS
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 2. Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- 3. Create the new, safe policy
CREATE POLICY "Admins can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  is_admin() = true
);
