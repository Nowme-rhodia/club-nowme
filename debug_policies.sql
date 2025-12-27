-- List all policies on user_profiles to identify duplicates or unexpected ones
SELECT polname, polcmd, polroles, polqual
FROM pg_policy
WHERE polrelid = 'user_profiles'::regclass;
