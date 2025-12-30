-- CHECK IF REMINDER WAS SENT
-- The generic email is 'rhodia+test@nowme.fr'.
-- If you used a different one, please create a new query or edit this one.

SELECT 
    id, 
    email, 
    signup_reminder_sent 
FROM user_profiles 
WHERE email = 'rhodia+test@nowme.fr';
