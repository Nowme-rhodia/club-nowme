-- Enable feedback emails (retry)
-- Skip CREATE EXTENSION as it requires superuser

DO $$
BEGIN
    -- Only proceed if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Unschedule if exists
        PERFORM cron.unschedule('send-feedback-emails');

        -- Schedule new job
        PERFORM cron.schedule(
            'send-feedback-emails',
            '0 * * * *', -- Every hour
            $sql$
            SELECT
              net.http_post(
                  url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-feedback-email',
                  headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.sub', true) || '"}'::jsonb,
                  body:='{}'::jsonb
              ) as request_id;
            $sql$
        );
    ELSE
        RAISE NOTICE 'pg_cron extension not found. Please enable it in the Supabase Dashboard > Database > Extensions.';
    END IF;
END
$$;
