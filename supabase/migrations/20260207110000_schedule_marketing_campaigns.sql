-- Schedule the marketing campaign job to run daily at 9 AM Paris time (8 AM UTC aprox)
-- We use 8 AM UTC here.

SELECT cron.schedule(
    'send-marketing-campaigns',
    '0 8 * * *', -- At 08:00 UTC
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-marketing-campaigns',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
);
