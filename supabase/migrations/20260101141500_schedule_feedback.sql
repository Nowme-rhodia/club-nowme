-- TEMPORARILY DISABLED TO UNBLOCK DEPLOYMENT
-- Permissions for pg_cron are failing.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

/*
SELECT cron.schedule(
    'send-feedback-emails',
    '0 * * * *', -- Every hour
    $$
    SELECT
      net.http_post(
          url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-feedback-email',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.sub', true) || '"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
*/
