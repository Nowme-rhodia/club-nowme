-- FINAL RECURSION FIX
-- The previous attempt failed because the helper function missed generic "SECURITY DEFINER",
-- causing it to still be subject to RLS checks, confusing the query planner/executor.

-- 1. Drop the policy to be safe
DROP POLICY IF EXISTS "Unified reading permissions" ON user_profiles;
DROP POLICY IF EXISTS "Partners can view profiles of their clients" ON user_profiles;

-- 2. REDEFINE the function with SECURITY DEFINER (CRITICAL!)
-- This runs the function as the database owner, BYPASSING RLS for this specific SELECT.
CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER 
SET search_path = public
STABLE
AS $$
  SELECT partner_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- 3. Re-apply the Unified Policy
CREATE POLICY "Unified reading permissions"
ON user_profiles
FOR SELECT
TO authenticated
USING (
    -- Case 1: My own profile (Simple, recursion-safe usually, but we use OR)
    auth.uid() = user_id
    
    OR 
    
    -- Case 2: I am a partner viewing a client
    -- The function get_my_partner_id() is now SECURITY DEFINER, so it DOES NOT trigger RLS.
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
