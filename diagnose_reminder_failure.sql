-- DIAGNOSTIC SCRIPT
-- Check ALl fields relevant to the reminder logic
SELECT 
    id, 
    email, 
    created_at, 
    selected_plan,        -- MUST NOT BE NULL
    reminder_step, 
    last_reminder_sent_at,
    signup_reminder_sent, -- Legacy flag
    (NOW() - created_at) as age
FROM user_profiles 
WHERE email = 'qlesc.podcast@gmail.com'; -- The email from your screenshot
