-- FIX OFFERS VISIBILITY
-- The goal is to ensure EVERYONE (Public, Subscribers, Admins) can see active/approved offers.

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- 1. Policy for Public/Everyone to see APPROVED offers
-- We drop existing restrictive policies that might be blocking Subscribers
DROP POLICY IF EXISTS "Public can view active offers" ON "public"."offers";
DROP POLICY IF EXISTS "Everyone can view active offers" ON "public"."offers";
DROP POLICY IF EXISTS "Users can view active offers" ON "public"."offers";
DROP POLICY IF EXISTS "Everyone can view approved offers" ON "public"."offers";

CREATE POLICY "Everyone can view approved offers"
ON "public"."offers"
FOR SELECT
USING (
   status = 'approved'
);


-- 2. Ensure PARTNERS can still see their own (even drafts)
DROP POLICY IF EXISTS "Partners can view own offers" ON "public"."offers";

CREATE POLICY "Partners can view own offers"
ON "public"."offers"
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE partner_id = offers.partner_id
  )
);
-- This allows partners to see their draft/pending offers.


-- 3. RE-APPLY Partners Table Access (Just to be 100% sure)
DROP POLICY IF EXISTS "Public can view partners" ON "public"."partners";
CREATE POLICY "Public can view partners"
ON "public"."partners"
FOR SELECT
USING (true);


-- 4. RE-APPLY Offer Variants Access
DROP POLICY IF EXISTS "Public can view offer variants" ON "public"."offer_variants";
CREATE POLICY "Public can view offer variants"
ON "public"."offer_variants"
FOR SELECT
USING (true);
