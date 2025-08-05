-- Diagnostic et correction de la contrainte FK sur user_profiles
-- À exécuter dans Supabase SQL Editor

-- 1. Voir les contraintes actuelles
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_profiles';

-- 2. Supprimer la contrainte FK problématique
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_user;

-- 3. Supprimer aussi l'autre contrainte FK si elle existe
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- 4. Vérifier que les contraintes ont été supprimées
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_profiles';

-- 5. Créer une nouvelle contrainte FK plus flexible (optionnelle)
-- Cette contrainte permet les valeurs NULL et les UUID temporaires
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_fkey_flexible 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- 6. Créer une fonction pour lier les profils aux utilisateurs auth
CREATE OR REPLACE FUNCTION link_profile_to_auth_user(
  profile_email text,
  auth_user_id uuid
) RETURNS boolean AS $$
BEGIN
  -- Mettre à jour le profil avec le vrai user_id
  UPDATE user_profiles 
  SET user_id = auth_user_id,
      updated_at = now()
  WHERE email = profile_email 
    AND (user_id IS NULL OR user_id != auth_user_id);
  
  -- Retourner true si une ligne a été mise à jour
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Test : Créer un profil temporaire pour vérifier
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

-- 8. Vérifier que l'insertion fonctionne
SELECT 
  id, 
  user_id, 
  email, 
  subscription_status,
  'Profil temporaire créé avec succès' as status
FROM user_profiles 
WHERE email = 'test-temp@example.com';

-- 9. Nettoyer le test
DELETE FROM user_profiles WHERE email = 'test-temp@example.com';