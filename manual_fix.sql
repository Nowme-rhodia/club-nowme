
-- 1. Extensions should be enabled in Dashboard. 
-- We skip CREATE EXTENSION to avoid "dependent privileges" errors.

-- 2. Schedule Feedback Emails (Hourly)
-- unschedule removed to allow upsert
SELECT cron.schedule(
    'send-feedback-emails',
    '0 * * * *',
    $$
    SELECT
      net.http_post(
          url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-feedback-email',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU5MTU4MSwiZXhwIjoyMDU0MTY3NTgxfQ.WXPj9YGH5H-rCYGzcgAUS0LTZGe9waDkJpxhQTrsqjI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 3. Schedule Weekly Recap (Tuesday 06:30)
SELECT cron.schedule(
    'send-weekly-recap',
    '30 6 * * 2',
    $$
    SELECT
      net.http_post(
          url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-weekly-recap',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU5MTU4MSwiZXhwIjoyMDU0MTY3NTgxfQ.WXPj9YGH5H-rCYGzcgAUS0LTZGe9waDkJpxhQTrsqjI"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 4. Check active jobs
SELECT * FROM cron.job;
