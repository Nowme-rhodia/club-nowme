-- CLEANUP SCRIPT & UNIFIED POLICY FIX
-- The existence of multiple policies causes recursion because Postgres may evaluate all of them.
-- Solution: A single SELECT policy with short-circuit OR logic.

-- 1. Drop EVERYTHING related to user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their clients" ON user_profiles;
DROP POLICY IF EXISTS "Partner view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Unified reading permissions" ON user_profiles;

-- Ensure RLS is on
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Helper function (still useful for readability)
CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 3. UNIFIED SELECT POLICY (The Fix)
-- Logic: 
--   1. Is it me? (auth.uid() = user_id) -> TRUE (Short-circuit, stops execution)
--   2. OR: Am I a partner looking at a booking? -> executes helper -> helper looks at Me -> hits #1 -> TRUE -> helper returns -> checks booking -> TRUE/FALSE
CREATE POLICY "Unified reading permissions"
ON user_profiles
FOR SELECT
TO authenticated
USING (
    -- Condition 1: Access Own Profile (Prioritized)
    auth.uid() = user_id
    
    OR 
    
    -- Condition 2: Partner Access
    (
        get_my_partner_id() IS NOT NULL AND
        EXISTS (
            SELECT 1 
            FROM bookings
            WHERE bookings.user_id = user_profiles.user_id
            AND bookings.partner_id = get_my_partner_id()
        )
    )
);

-- 4. Write Permissions (Separate, simple)
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
