-- VERIFICATION SCRIPT
-- Run this to verify the cleanup logic.

BEGIN;

-- 1. Setup Test Data
-- Insert an old log
INSERT INTO public.email_logs (status, message, created_at)
VALUES ('test_cleanup', 'Should be deleted', now() - interval '31 days');

-- Insert a recent log (should NOT be deleted)
INSERT INTO public.email_logs (status, message, created_at)
VALUES ('test_keep', 'Should function', now() - interval '2 days');

-- Insert an orphaned partner (old)
INSERT INTO public.partners (id, business_name, status, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ghost Partner Old', 'pending', now() - interval '8 days');

-- Insert an orphaned partner (recent)
INSERT INTO public.partners (id, business_name, status, created_at)
VALUES ('00000000-0000-0000-0000-000000000002', 'Ghost Partner New', 'pending', now() - interval '1 day');

-- 2. Inspect before
SELECT count(*) as old_logs_count FROM public.email_logs WHERE message = 'Should be deleted';
SELECT count(*) as old_partners_count FROM public.partners WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Run Cleanup
SELECT public.cleanup_database();

-- 4. Verify
SELECT count(*) as old_logs_remaining FROM public.email_logs WHERE message = 'Should be deleted';
SELECT count(*) as old_partners_remaining FROM public.partners WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT count(*) as new_partners_remaining FROM public.partners WHERE id = '00000000-0000-0000-0000-000000000002';

ROLLBACK; -- Rollback changes after test
