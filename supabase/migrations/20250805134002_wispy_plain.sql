-- 1. Supprimer complètement la contrainte FK flexible
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey_flexible;

-- 2. Supprimer aussi l'ancienne contrainte si elle existe encore
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_user;

-- 3. Vérifier qu'il n'y a plus de contraintes FK sur user_id
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass 
AND contype = 'f';

-- 4. Maintenant tester l'insertion
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
) ON CONFLICT (email) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  subscription_type = EXCLUDED.subscription_type,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  updated_at = now();

-- 5. Vérifier que l'insertion a fonctionné
SELECT id, user_id, email, subscription_status, subscription_type 
FROM user_profiles 
WHERE email = 'test-temp@example.com';

-- 6. Créer une fonction pour lier les profils aux utilisateurs auth plus tard
CREATE OR REPLACE FUNCTION link_profile_to_auth_user(
  profile_email text,
  auth_user_id uuid
) RETURNS boolean AS $$
BEGIN
  UPDATE user_profiles 
  SET user_id = auth_user_id,
      updated_at = now()
  WHERE email = profile_email 
  AND user_id != auth_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Test de la fonction de liaison
SELECT link_profile_to_auth_user('test-temp@example.com', gen_random_uuid());