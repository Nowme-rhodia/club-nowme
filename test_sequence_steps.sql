-- TEST SCRIPT FOR 3-STEP SEQUENCE
-- Run these one by one to test each step (after deploying the function)

-- 1. RESET TO TEST STEP 1 (1 hour ago)
UPDATE user_profiles
SET 
  created_at = NOW() - INTERVAL '2 hours',
  reminder_step = 0,
  last_reminder_sent_at = NULL,
  signup_reminder_sent = false
WHERE email = 'rhodia+test@nowme.fr';


-- 2. FORCE TEST STEP 2 (3 days ago, step 1 done)
UPDATE user_profiles
SET 
  created_at = NOW() - INTERVAL '4 days',
  reminder_step = 1,
  last_reminder_sent_at = NOW() - INTERVAL '4 days' -- Sent step 1 long ago
WHERE email = 'rhodia+test@nowme.fr'; -- CHANGE EMAIL


-- 3. FORCE TEST STEP 3 (15 days ago, step 2 done)
UPDATE user_profiles
SET 
  created_at = NOW() - INTERVAL '16 days',
  reminder_step = 2,
  last_reminder_sent_at = NOW() - INTERVAL '12 days' -- Sent step 2 long ago
WHERE email = 'rhodia+test@nowme.fr'; -- CHANGE EMAIL

-- CHECK STATUS
SELECT email, reminder_step, last_reminder_sent_at, created_at FROM user_profiles WHERE email = 'rhodia+test@nowme.fr';
