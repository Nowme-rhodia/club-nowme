-- Update the cron job to run every minute instead of every 30 minutes
SELECT cron.unschedule('process-newsletters');

SELECT cron.schedule(
    'process-newsletters',
    '* * * * *', -- Run every minute
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/process-scheduled-newsletters',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
      ) as request_id;
    $$
);
