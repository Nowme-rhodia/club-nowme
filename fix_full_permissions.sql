-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- 1. User Profiles: Allow users to view and edit their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."user_profiles";
CREATE POLICY "Users can view own profile"
ON "public"."user_profiles"
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON "public"."user_profiles";
CREATE POLICY "Users can update own profile"
ON "public"."user_profiles"
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."user_profiles";
CREATE POLICY "Users can insert own profile"
ON "public"."user_profiles"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Partners: Allow read access for linked users
DROP POLICY IF EXISTS "Partners can view own data" ON "public"."partners";
CREATE POLICY "Partners can view own data"
ON "public"."partners"
FOR SELECT
USING (
  AUTH.UID() IN (
    SELECT user_id FROM user_profiles WHERE partner_id = partners.id
  )
);

-- OPTIONAL: Allow update for partners
DROP POLICY IF EXISTS "Partners can update own data" ON "public"."partners";
CREATE POLICY "Partners can update own data"
ON "public"."partners"
FOR UPDATE
USING (
  AUTH.UID() IN (
    SELECT user_id FROM user_profiles WHERE partner_id = partners.id
  )
);

-- 3. Offers: Allow partners to manage their offers
DROP POLICY IF EXISTS "Partners can view own offers" ON "public"."offers";
CREATE POLICY "Partners can view own offers"
ON "public"."offers"
FOR SELECT
USING (
  partner_id IN (
    SELECT partner_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Partners can insert offers" ON "public"."offers";
CREATE POLICY "Partners can insert offers"
ON "public"."offers"
FOR INSERT
WITH CHECK (
  partner_id IN (
    SELECT partner_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Partners can update own offers" ON "public"."offers";
CREATE POLICY "Partners can update own offers"
ON "public"."offers"
FOR UPDATE
USING (
  partner_id IN (
    SELECT partner_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Partners can delete own offers" ON "public"."offers";
CREATE POLICY "Partners can delete own offers"
ON "public"."offers"
FOR DELETE
USING (
  partner_id IN (
    SELECT partner_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- 4. Admin Access (Service Role usually bypasses, but good to have)
-- If is_admin is true in user_profiles
DROP POLICY IF EXISTS "Admins can do everything" ON "public"."offers";
-- Warning: recursive policies can be slow/dangerous. 
-- Best practice: rely on service role key for admin tasks or dedicated admin role.
-- For E2E test user (adminx-test), if they use the app UI, they need RLS access.
-- We'll assume admin users have is_admin=true in user_profiles.

CREATE POLICY "Admins can view all offers"
ON "public"."offers"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update all offers"
ON "public"."offers"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);
