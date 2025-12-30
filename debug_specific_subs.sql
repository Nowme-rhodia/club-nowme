-- Check profiles and their subscriptions for the users visible in the screenshot
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.email,
    s.status as subscription_status,
    s.id as subscription_id,
    s.current_period_end
FROM user_profiles up
LEFT JOIN subscriptions s ON up.user_id = s.user_id
WHERE 
    up.first_name ILIKE '%RHORHO%' OR 
    up.last_name ILIKE '%RHORHO%' OR
    up.first_name ILIKE '%Test238%' OR
    up.first_name ILIKE '%Test173%' OR
    up.first_name ILIKE '%Boris%';
