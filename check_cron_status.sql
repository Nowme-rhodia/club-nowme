-- 1. Check if the extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Check scheduled jobs
SELECT * FROM cron.job;

-- 3. Check job run details (logs) logic might vary depending on permissions, but usually:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;

-- 4. Check the newsletter status
SELECT id, subject, status, scheduled_at, created_at, sent_at 
FROM public.admin_newsletters 
ORDER BY created_at DESC;

-- 5. Check if the function URL in the cron job is correct
SELECT command FROM cron.job WHERE jobname = 'process-newsletters';
