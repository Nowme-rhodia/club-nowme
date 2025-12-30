-- Fix Cron Syntax and Authentication Approach
-- Since the function is deployed with --no-verify-jwt, we don't strictly need the Auth header in the cron call.
-- We also use jsonb_build_object to avoid syntax errors.

SELECT cron.unschedule('process-newsletters');

SELECT cron.schedule(
    'process-newsletters',
    '* * * * *', -- Every minute
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/process-scheduled-newsletters',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json'
        )
      ) as request_id;
    $$
);

-- Check that it is scheduled
SELECT * FROM cron.job WHERE jobname = 'process-newsletters';
