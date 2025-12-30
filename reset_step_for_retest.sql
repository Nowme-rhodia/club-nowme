-- RESET TO STEP 2 (AGAIN)
-- Run this to verify the Smart Link flow (Step 3 email)

UPDATE user_profiles
SET reminder_step = 2
WHERE email = 'qlesc.podcast@gmail.com';

-- Verify it is now 2
SELECT email, reminder_step FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com';
