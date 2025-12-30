-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;

-- Grant usage to postgres (and service_role if needed, though cron runs as superuser usually)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Unschedule existing jobs to avoid duplicates
SELECT cron.unschedule('process-newsletters');

-- Schedule the job to run every minute
-- NOTE: We use the API URL directly. Ensure this matches your project URL.
-- PROJECT_REF expected to be: dqfyuhwrjozoxadkccdj
SELECT cron.schedule(
    'process-newsletters',
    '* * * * *', -- Every minute
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/process-scheduled-newsletters',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
      ) as request_id;
    $$
);

-- Verification Query (Run this manually to check if it appears)
SELECT * FROM cron.job;
