-- 1. PREPARE THE USER (Make them eligible for reminder)
-- Replace 'rhodia+test@nowme.fr' with your actual test email if different.

UPDATE user_profiles
SET 
  created_at = NOW() - INTERVAL '2 hours', -- Make them older than 1h
  signup_reminder_sent = false,            -- Reset sent flag
  selected_plan = 'monthly'                -- Ensure they have a plan selected
WHERE email = 'rhodia+test@nowme.fr';      -- <--- CHECK THIS EMAIL

-- Verify the user state
SELECT email, created_at, selected_plan, signup_reminder_sent
FROM user_profiles
WHERE email = 'rhodia+test@nowme.fr';
