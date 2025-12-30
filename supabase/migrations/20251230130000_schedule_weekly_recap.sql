-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Weekly Recap for Tuesday at 06:30 AM
-- (Cron syntax: min hour day month day_of_week)
-- 30 6 * * 2 = 06:30 on Tuesday
SELECT cron.schedule(
    'weekly-recap',
    '30 6 * * 2',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-weekly-recap',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
      ) as request_id;
    $$
);
