-- Migration: Schedule feedback email job
-- Created at: 2026-01-01T14:15:00.000Z

-- Ensure the extension is enabled (usually is, but good practice)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every hour at minute 0
-- Syntax: cron.schedule(job_name, schedule, command)
SELECT cron.schedule(
    'send-feedback-emails-hourly', -- Unique job name
    '0 * * * *',                   -- Every hour
    $$
    SELECT
      net.http_post(
          url:='https://your-project-ref.supabase.co/functions/v1/send-feedback-email',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Note: The URL and Bearer token need to be replaced with actual Project Ref and Service Key in production.
-- Use creating a webhook trigger as an alternative if pg_net is tricky to configure with secrets in SQL.
-- ALTERNATIVE: Use a trigger if we wanted it "on status change", but here we need TIME based.
-- So pg_cron is correct.
--
-- HOWEVER, hardcoding the key in SQL is bad practice.
-- BETTER APPROACH: The Supabase Dashboard "Database -> Cron" UI or "Edge Functions" section is often safer for secrets.
-- BUT, we can use `vault` if available, or just rely on the user to set it up or use a secure way.
--
-- SIMPLER: The user can trigger it via a GitHub Action or an external cron service if pg_cron is hard to config with keys.
--
-- FOR NOW: I will provide the SQL but commented out the key part for them to fill, OR just invoke it via the internal postgres `http` extension if available and configured.
-- Actually, inside supabase, `select net.http_post` is the standard way.
