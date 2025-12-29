-- DIAGNOSTIC SCRIPT (Run this in Supabase SQL Editor)

-- 1. Check for Policies on auth.users (There should generally be NONE or very few specific ones)
SELECT 'Checking Policies on auth.users' as check_type;
SELECT * FROM pg_policies WHERE schemaname = 'auth' AND tablename = 'users';

-- 2. Check for Triggers on auth.users (Triggers often cause recursion if they call functions that query tables with RLS)
SELECT 'Checking Triggers on auth.users' as check_type;
SELECT tgname, tgenabled, tgisinternal, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;

-- 3. Check for Policies on user_profiles (Verify if previous fixes stuck)
SELECT 'Checking Policies on user_profiles' as check_type;
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 4. Check for Recursion in Functions (Loops in get_auth_partner_id or similar)
SELECT 'Checking Logic Functions' as check_type;
SELECT proname, prosrc FROM pg_proc WHERE proname IN ('get_auth_partner_id', 'get_my_partner_id');
