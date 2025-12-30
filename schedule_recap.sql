-- Enable the pg_cron extension if not already enabled
-- Note: This requires superuser permissions, which might not be available in all Supabase contexts directly via SQL editor if not provided.
-- However, we can try to schedule the job.

select
  cron.schedule(
    'weekly-recap', -- job name
    '30 6 * * 2', -- Tuesday at 06:30 AM
    $$
    select
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-weekly-recap',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
      ) as request_id;
    $$
  );
