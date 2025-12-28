-- Migration: emergency_fix_recursion
-- Created at: 2025-12-28T09:30:00Z

-- 1. Create helper function to check admin status securely without recursion
-- SECURITY DEFINER allows this function to bypass RLS on user_profiles when called
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 2. Drop existing policies to clear the slate
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Partner can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;

-- 3. Create clean, recursion-free policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Self-read
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
TO authenticated
USING ( user_id = auth.uid() );

-- Admin-all (READ/WRITE)
-- Uses the is_admin() function which bypasses RLS, preventing recursion
CREATE POLICY "Admins can perform all actions"
ON user_profiles FOR ALL
TO authenticated
USING ( is_admin() );

-- Self-update
CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING ( user_id = auth.uid() );

-- Self-insert (needed for signup triggers sometimes)
CREATE POLICY "Users can insert their own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK ( user_id = auth.uid() );

-- Grant schema usage just in case
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
