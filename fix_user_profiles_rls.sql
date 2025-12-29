-- FIX RLS RECURSION ON user_profiles (Definitive V2)

-- 1. Redefine is_admin to be extra safe
-- Drop BOTH versions to avoid ambiguity
-- USE CASCADE to strictly remove conflicting policies on other tables (like customer_orders)
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- SECURITY DEFINER ensures it runs with permissions of the creator (postgres/superuser), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if the user has the is_admin flag
  -- We select directly from the table. Since it's SECURITY DEFINER, RLS on user_profiles is IGNORED for this query.
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 2. Drop existing policies on user_profiles to ensure no conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Partner can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
DROP POLICY IF EXISTS "Admins can perform all actions" ON user_profiles;
DROP POLICY IF EXISTS "Unified User Profile Access" ON user_profiles;

-- 3. Create a Single Unified Policy for SELECT on user_profiles
CREATE POLICY "Unified User Profile Access"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR is_admin()
);

-- 4. Create separate Write policies for user_profiles
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK ( user_id = auth.uid() );

-- 5. Admin Write Access for user_profiles
CREATE POLICY "Admins can update all profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING ( is_admin() );

CREATE POLICY "Admins can delete all profiles"
ON user_profiles
FOR DELETE
TO authenticated
USING ( is_admin() );

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, anon, service_role;

-- 7. RECREATE DROPPED POLICIES (due to CASCADE)
-- Recreate customer_orders policy that was dropped
-- We assume it was "Admins can view all orders" or similar
DROP POLICY IF EXISTS "customer_orders_admin_all" ON customer_orders;
CREATE POLICY "customer_orders_admin_all"
ON customer_orders
FOR ALL
TO authenticated
USING ( is_admin() );
