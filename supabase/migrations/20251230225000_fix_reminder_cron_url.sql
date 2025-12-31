-- FIX CRON SCHEDULE FOR REMINDERS (Real URL)
-- Previous migration used placeholders. We fix this here.

SELECT cron.unschedule('send-abandoned-signup-reminders');

SELECT cron.schedule(
    'send-abandoned-signup-reminders',
    '0 * * * *', -- Run every hour (simplifed to hourly for stability)
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-abandoned-signup-reminder',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
      ) as request_id;
    $$
);

-- Note: We assume 'app.settings.service_role_key' is available in Vault/Settings. 
-- If not, and the function is --no-verify-jwt, the Auth header might be optional 
-- or we might need another way. But this is the standard secure pattern.
