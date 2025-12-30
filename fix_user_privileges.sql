-- REMOVE ADMIN RIGHTS & CLEANUP
-- This user likely has is_admin = true, giving them access to the dashboard.
-- We want to simulate a real NEW user (unpaid, not admin).

UPDATE user_profiles
SET is_admin = false
WHERE email = 'qlesc.podcast@gmail.com';

-- Ensure no subscriptions exist
DELETE FROM subscriptions 
WHERE user_id IN (SELECT user_id FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com');

-- Reset stats for email test
UPDATE user_profiles
SET 
  reminder_step = 2,
  created_at = NOW() - INTERVAL '16 days' -- Keep the time travel for email test
WHERE email = 'qlesc.podcast@gmail.com';

-- Verify the final state
SELECT email, is_admin, reminder_step FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com';
