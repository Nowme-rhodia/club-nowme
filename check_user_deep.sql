-- CHECK DATA EXACTLY
SELECT 
    u.id as profile_id,
    u.user_id,
    u.email,
    u.first_name,
    s.id as sub_id,
    s.status as sub_status,
    s.created_at as sub_created_at
FROM user_profiles u
LEFT JOIN subscriptions s ON u.user_id = s.user_id
WHERE u.email = 'qlesc.podcast@gmail.com';
