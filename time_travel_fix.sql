-- FORCE TIME TRAVEL
-- Backdate created_at to > 15 days ago so Step 3 triggers

UPDATE user_profiles
SET 
  reminder_step = 2,
  created_at = NOW() - INTERVAL '16 days',
  last_reminder_sent_at = NOW() - INTERVAL '4 days' -- Not strictly checked for Step 3, but clean
WHERE email = 'qlesc.podcast@gmail.com';

-- Verify
SELECT email, reminder_step, created_at FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com';
