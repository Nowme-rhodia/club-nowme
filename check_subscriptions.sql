-- CHECK SUBSCRIPTIONS CONSISTENCY

-- 1. List all active subscriptions and check if they have a user_profile
SELECT 
    s.id as subscription_id,
    s.user_id,
    s.status,
    u.first_name,
    u.last_name,
    u.email
FROM subscriptions s
LEFT JOIN user_profiles u ON s.user_id = u.user_id
WHERE s.status = 'active';

-- 2. Check if any subscriptions point to non-existent auth.users
-- (This shouldn't happen with FKs, but good to check)
SELECT count(*) as "Subscriptions with no Auth User"
FROM subscriptions s
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = s.user_id);

-- 3. Check if any subscriptions point to non-existent user_profiles
-- If the user deleted user_profiles manually but kept auth.users/subscriptions, this will be non-zero
SELECT count(*) as "Subscriptions with no User Profile"
FROM subscriptions s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = s.user_id);
