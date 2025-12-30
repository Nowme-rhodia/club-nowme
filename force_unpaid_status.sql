-- CLEANUP FOR TEST USER (CORRECTED)
-- Ensure this user has NO active subscription

-- 1. Delete any subscriptions linked to this user (This is the source of truth)
DELETE FROM subscriptions 
WHERE user_id IN (SELECT user_id FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com');

-- 2. Reset reminder step to 2 (to re-test the email flow)
UPDATE user_profiles
SET reminder_step = 2
WHERE email = 'qlesc.podcast@gmail.com';
