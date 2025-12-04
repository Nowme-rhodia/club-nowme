-- Script de diagnostic pour les timeouts Supabase

-- 1. Vérifier que l'utilisateur existe
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE id = '8c297304-27dc-47e2-adf3-40ff13415463';

-- 2. Vérifier le profil utilisateur
SELECT *
FROM user_profiles
WHERE user_id = '8c297304-27dc-47e2-adf3-40ff13415463';

-- 3. Vérifier l'abonnement
SELECT *
FROM subscriptions
WHERE user_id = '8c297304-27dc-47e2-adf3-40ff13415463';

-- 4. Vérifier les RLS (Row Level Security) sur user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 5. Vérifier les RLS sur subscriptions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'subscriptions';

-- 6. Vérifier les index sur user_profiles
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles';

-- 7. Vérifier les index sur subscriptions
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions';

-- 8. Tester une requête simple (sans RLS)
SET ROLE postgres;
SELECT COUNT(*) FROM user_profiles;
SELECT COUNT(*) FROM subscriptions;

-- 9. Tester avec RLS (comme l'application)
SET ROLE authenticated;
SET request.jwt.claim.sub = '8c297304-27dc-47e2-adf3-40ff13415463';
SELECT * FROM user_profiles WHERE user_id = '8c297304-27dc-47e2-adf3-40ff13415463';
SELECT * FROM subscriptions WHERE user_id = '8c297304-27dc-47e2-adf3-40ff13415463';
