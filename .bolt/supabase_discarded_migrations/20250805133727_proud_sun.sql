-- 🔧 CORRECTION : Ajouter contrainte unique sur email et tester l'insertion

-- 1. Vérifier s'il y a des doublons d'email existants
SELECT email, COUNT(*) as count 
FROM user_profiles 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 2. Ajouter la contrainte unique sur email (si pas de doublons)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);

-- 3. Maintenant tester l'insertion avec ON CONFLICT
INSERT INTO user_profiles (
  user_id, 
  email, 
  subscription_status, 
  subscription_type,
  stripe_customer_id
) VALUES (
  gen_random_uuid(), -- UUID temporaire
  'test-temp@example.com',
  'active',
  'discovery',
  'cus_test_123'
) ON CONFLICT (email) DO NOTHING;

-- 4. Vérifier que l'insertion a fonctionné
SELECT 'Insertion réussie' as status, id, email, user_id, subscription_status 
FROM user_profiles 
WHERE email = 'test-temp@example.com';

-- 5. Alternative : Si vous voulez mettre à jour en cas de conflit
INSERT INTO user_profiles (
  user_id, 
  email, 
  subscription_status, 
  subscription_type,
  stripe_customer_id
) VALUES (
  gen_random_uuid(),
  'test-temp2@example.com',
  'active',
  'discovery',
  'cus_test_456'
) ON CONFLICT (email) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  subscription_type = EXCLUDED.subscription_type,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  updated_at = now();

-- 6. Vérifier les deux insertions
SELECT 'Résultat final' as status, email, subscription_status, stripe_customer_id 
FROM user_profiles 
WHERE email IN ('test-temp@example.com', 'test-temp2@example.com')
ORDER BY email;