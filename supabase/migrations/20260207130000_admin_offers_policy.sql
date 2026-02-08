-- Migration: Allow admins to manage all offers
-- Description: Adds RLS policy for admins to perform ALL operations on offers table

-- Drop existing admin policy if it exists to avoid conflicts (though rare to have exact name match)
DROP POLICY IF EXISTS "Admins can do everything on offers" ON offers;

-- Create comprehensive admin policy
CREATE POLICY "Admins can do everything on offers"
ON offers
FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
);

-- Ensure partners table is readable by admins (likely already true, but safe to add)
DROP POLICY IF EXISTS "Admins can view all partners" ON partners;
CREATE POLICY "Admins can view all partners"
ON partners
FOR SELECT
TO authenticated
USING (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
);
