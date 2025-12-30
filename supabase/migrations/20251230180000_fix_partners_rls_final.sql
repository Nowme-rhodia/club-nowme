-- Fix Partners Table RLS (Definitive)
-- Drop ALL existing policies on partners to ensure a clean slate and remove conflicts
DROP POLICY IF EXISTS "Partners view own" ON partners;
DROP POLICY IF EXISTS "Admins manage partners" ON partners;
DROP POLICY IF EXISTS "Public view approved partners" ON partners;
DROP POLICY IF EXISTS "Enable read access for all users" ON partners;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON partners;
DROP POLICY IF EXISTS "Enable update for users based on email" ON partners;
DROP POLICY IF EXISTS "Partners can view own profile" ON partners;
DROP POLICY IF EXISTS "Partners can update own profile" ON partners;
DROP POLICY IF EXISTS "Admins can view all partners" ON partners;
DROP POLICY IF EXISTS "Admins can update all partners" ON partners;
DROP POLICY IF EXISTS "Public can view approved partners" ON partners;
DROP POLICY IF EXISTS "Partners can view own data" ON partners;

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- 1. Admins can do everything (using the safe recursion-proof function)
CREATE POLICY "Admins manage partners"
ON partners
FOR ALL
TO authenticated
USING ( is_admin() );

-- 2. Partners can view/edit their own data
-- We link via user_profiles since partners table doesn't have user_id
CREATE POLICY "Partners can view own data"
ON partners
FOR ALL
TO authenticated
USING (
  exists (
    select 1 from user_profiles
    where user_profiles.user_id = auth.uid()
    and user_profiles.partner_id = partners.id
  )
);

-- 3. Public can view approved partners (for directory/offers)
CREATE POLICY "Public view approved partners"
ON partners
FOR SELECT
TO public
USING ( status = 'approved' );
