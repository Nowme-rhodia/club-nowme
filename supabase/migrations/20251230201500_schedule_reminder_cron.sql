-- Create a cron job to run the abandoned signup reminder
-- Runs every 30 minutes
select
  cron.schedule(
    'send-abandoned-signup-reminders',
    '*/30 * * * *',
    $$
    select
      net.http_post(
          url:='https://project-ref.supabase.co/functions/v1/send-abandoned-signup-reminder',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
      ) as request_id;
    $$
  );
