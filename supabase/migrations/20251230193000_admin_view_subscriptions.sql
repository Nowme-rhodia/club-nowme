-- Allow admins to view all subscriptions
-- This is necessary for the Admin Dashboard to show the correct status for all users
CREATE POLICY "Admins can view all subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (
  is_admin_secure()
);
