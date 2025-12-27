-- Inspect policies on bookings and user_profiles
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_profiles', 'bookings')
ORDER BY tablename, policyname;
