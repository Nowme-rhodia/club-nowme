-- FORCE FIX & TRIGGER
-- This script ensures the user has a plan, sets the dates for STEP 3, and triggers the function immediately.

-- 1. UPDATE USER (Ensure selected_plan is set!)
UPDATE user_profiles
SET 
  selected_plan = 'monthly',  -- Force a plan (cannot be null)
  created_at = NOW() - INTERVAL '16 days', -- Age > 15 days
  reminder_step = 2,          -- Ready for Step 3
  last_reminder_sent_at = NOW() - INTERVAL '4 days', -- Step 2 sent previously
  signup_reminder_sent = true -- Ignore this legacy flag
WHERE email = 'qlesc.podcast@gmail.com';

-- 2. TRIGGER FUNCTION IMMEDIATELY
select
  net.http_post(
      url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-abandoned-signup-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1OTE1ODEsImV4cCI6MjA1NDE2NzU4MX0.AyNhHFCQmznBICOShFYL0dkCuGkN9FpKD4MNvQ0cHZA"}'::jsonb
  ) as request_id;

-- 3. VERIFY
SELECT email, reminder_step, selected_plan FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com';
