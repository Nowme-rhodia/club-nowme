SELECT 
    u.id, 
    u.email, 
    s.status as sub_status, 
    s.current_period_end,
    u.subscription_status as profile_status -- Check if this column exists and is desynced
FROM user_profiles u
LEFT JOIN subscriptions s ON u.user_id = s.user_id
WHERE u.email = 'qlesc.podcast@gmail.com';
