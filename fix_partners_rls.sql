-- Enable RLS on partners if not already enabled (it should be)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Allow partners to view their own data
DROP POLICY IF EXISTS "Partners can view own data" ON "public"."partners";
CREATE POLICY "Partners can view own data"
ON "public"."partners"
FOR SELECT
USING (
  AUTH.UID() IN (
    SELECT user_id FROM user_profiles WHERE partner_id = partners.id
  )
);

-- OPTIONAL: Allow read access to everyone (if public profile)
-- Given the app behavior, maybe we need this for the "Devenir partenaire" or just general logic?
-- But the log says "PartnerLayout", which loads "MY" partner data. 
-- The error 406 often comes from "Head Request" or just "Not Acceptable" media type, 
-- BUT in Supabase/PostgREST it usually means: 
-- 1. No rows found (and .single() was used)
-- 2. RLS hid the row.

-- Let's ensure the user can see it. 
-- The user is 'entreprisepartenaire@gmail.com' -> ID '63b5c0d7-9d91-4704-b6ac-e31b1bc3f2c8'
-- The user profile says partner_id is 'c78f1403-22b5-43e9-ac0d-00577701731b'
-- The query is for id=eq.c78f1403-22b5-43e9-ac0d-00577701731b

-- Do we have a policy that links auth.uid() -> user_profiles -> partners?
-- Yes, added above.

-- Also, to be safe for dev environment, let's allow service role full access (default)
-- and maybe allow authenticated simple read if the above is too complex or failing due to recursion?
-- Recursive policies can be tricky.

-- Simpler approach for "Enable RLS for select for authenticated users" if we are okay with partners seeing other partners (often acceptable for directories)
-- DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."partners";
-- CREATE POLICY "Enable read access for all users" ON "public"."partners" FOR SELECT USING (true);
