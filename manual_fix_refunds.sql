-- FIX: Run this in Supabase Dashboard > SQL Editor
-- This fixes the connection between Refund Requests and User Profiles

-- 1. Ensure the foreign key exists explicitly for PostgREST
ALTER TABLE public.refund_requests 
DROP CONSTRAINT IF EXISTS refund_requests_user_profile_fkey;

ALTER TABLE public.refund_requests
ADD CONSTRAINT refund_requests_user_profile_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.user_profiles(user_id)
ON DELETE CASCADE;

-- 2. Force Supabase API to refresh its cache
NOTIFY pgrst, 'reload config';
