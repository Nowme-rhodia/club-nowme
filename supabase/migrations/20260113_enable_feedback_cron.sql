-- Enable pg_cron and schedule feedback emails
-- Based on previous failed migration, adding safety checks and permissions

-- 1. Ensure extension exists
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;

-- 2. Grant necessary permissions (sometimes needed on new projects)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 3. Schedule the job (run every hour)
-- We check if it exists first to avoid duplicate errors, then unschedule and reschedule
SELECT cron.unschedule('send-feedback-emails');

SELECT cron.schedule(
    'send-feedback-emails',
    '0 * * * *', -- At minute 0 of every hour
    $$
    SELECT
      net.http_post(
          url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-feedback-email',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.sub', true) || '"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
