-- Allow public read access to partners table
-- This is necessary for the 'Tous les kiffs' page to display Partner Name and City/Address for filtering.

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view partners" ON "public"."partners";

CREATE POLICY "Public can view partners"
ON "public"."partners"
FOR SELECT
USING (true);

-- Ensure offer_variants is also accessible (re-applying just in case)
DROP POLICY IF EXISTS "Public can view offer variants" ON "public"."offer_variants";

CREATE POLICY "Public can view offer variants"
ON "public"."offer_variants"
FOR SELECT
USING (true);
