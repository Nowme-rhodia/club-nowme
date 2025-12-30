-- FINAL RESET SCRIPT
-- 1. Force Step back to 2 (so you can receive the Step 3 email)
-- 2. Revoke Admin rights (so you don't bypass payments)
-- 3. Clear Subscriptions (so you aren't marked as Active)
-- 4. Set Time Travel (so you are "old enough" to receive the mail)

BEGIN;

UPDATE user_profiles
SET 
    reminder_step = 2,
    is_admin = false,
    created_at = NOW() - INTERVAL '20 days', -- Make user 20 days old ( > 15 days req)
    last_reminder_sent_at = NOW() - INTERVAL '4 days'
WHERE email = 'qlesc.podcast@gmail.com';

DELETE FROM subscriptions 
WHERE user_id IN (SELECT user_id FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com');

COMMIT;

-- Verify correct state
SELECT email, reminder_step, is_admin, created_at FROM user_profiles WHERE email = 'qlesc.podcast@gmail.com';
