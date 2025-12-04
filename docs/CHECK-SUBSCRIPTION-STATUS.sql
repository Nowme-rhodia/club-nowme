-- Vérifier le profil de l'utilisateur
SELECT 
    id,
    user_id,
    email,
    first_name,
    last_name,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id,
    created_at,
    updated_at
FROM user_profiles
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b';

-- Vérifier l'abonnement dans la table subscriptions
SELECT 
    id,
    user_id,
    stripe_subscription_id,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
FROM subscriptions
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b';

-- Si subscription_status est NULL, le mettre à jour manuellement
UPDATE user_profiles
SET 
    subscription_status = 'active',
    updated_at = NOW()
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b'
AND subscription_status IS NULL
RETURNING *;
