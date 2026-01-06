-- Fix Refund Requests Relations
-- Created: 2026-01-07

-- Allow embedding user_profiles in refund_requests queries
-- We add an explicit foreign key to public.user_profiles
-- We keep the auth.users FK for strict security or drop it? 
-- Usually we can have both, but for PostgREST detection, linking to the exposed table is key.

BEGIN;

-- 1. Ensure the constraint exists. 
-- We reference user_profiles(user_id) which is a unique column (1:1 with auth users)
ALTER TABLE public.refund_requests 
DROP CONSTRAINT IF EXISTS refund_requests_user_id_fkey; -- Drop the auto-generated one if it conflicts or just replace

ALTER TABLE public.refund_requests
ADD CONSTRAINT refund_requests_user_profile_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.user_profiles(user_id)
ON DELETE CASCADE;

-- 2. Force schema cache reload (Supabase specific helper often used, or just valid SQL)
NOTIFY pgrst, 'reload config';

COMMIT;
