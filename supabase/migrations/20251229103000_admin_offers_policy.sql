-- Migration: Allow Admins to UPDATE offers
-- Description: Fixes issue where Admins could not approve offers (update status) because of missing RLS policy.

-- 1. Policy for Admins to UPDATE offers
-- We check looking up the user_profiles table for is_admin = true

DROP POLICY IF EXISTS "Admins can update any offer" ON offers;

CREATE POLICY "Admins can update any offer"
ON offers
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
);

-- 2. Also ensure Admins can DELETE if needed (for rejection/cleanup, though usually we just status update)
DROP POLICY IF EXISTS "Admins can delete any offer" ON offers;

CREATE POLICY "Admins can delete any offer"
ON offers
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
);
