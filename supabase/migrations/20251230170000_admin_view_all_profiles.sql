-- Allow admins to view all user profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Admins can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  (SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()) = true
);

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Debug: check if admin exists and has is_admin=true
DO $$
BEGIN
  RAISE NOTICE 'Checking current user admin status...';
END $$;
