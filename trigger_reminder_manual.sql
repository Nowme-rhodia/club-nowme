-- 2. TRIGGER THE EMAIL FUNCTION MANUALLY
-- This uses pg_net to call the Edge Function immediately from SQL.

select
  net.http_post(
      url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-abandoned-signup-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1OTE1ODEsImV4cCI6MjA1NDE2NzU4MX0.AyNhHFCQmznBICOShFYL0dkCuGkN9FpKD4MNvQ0cHZA"}'::jsonb
  ) as request_id;
