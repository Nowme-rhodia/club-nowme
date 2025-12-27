-- Revert the problematic policy that caused infinite recursion and blocked access
DROP POLICY IF EXISTS "Partners can view profiles of their bookings" ON user_profiles;
