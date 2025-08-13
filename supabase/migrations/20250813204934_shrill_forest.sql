/*
  # Nettoyage complet et correction des problèmes

  1. Suppression des triggers et fonctions member_rewards
  2. Nettoyage des données de test avec respect des FK
  3. Création d'un utilisateur test simple
  4. Pas de member_rewards pour l'instant
*/

-- 1. SUPPRIMER LES TRIGGERS D'ABORD (ils dépendent des fonctions)
DROP TRIGGER IF EXISTS create_member_rewards_trigger ON public.user_profiles;
DROP TRIGGER IF EXISTS create_member_rewards_simple_trigger ON public.user_profiles;

-- 2. SUPPRIMER LES FONCTIONS member_rewards
DROP FUNCTION IF EXISTS create_member_rewards() CASCADE;
DROP FUNCTION IF EXISTS create_member_rewards_simple() CASCADE;
DROP FUNCTION IF EXISTS create_member_rewards_backup() CASCADE;

-- 3. NETTOYER LES DONNÉES DE TEST (ordre FK correct)
-- Supprimer email_logs AVANT emails
DELETE FROM public.email_logs WHERE email_id IN (
  SELECT id FROM public.emails WHERE to_address LIKE '%test%'
);

-- Supprimer emails
DELETE FROM public.emails WHERE to_address LIKE '%test%';

-- Supprimer stripe_webhook_events de test
DELETE FROM public.stripe_webhook_events WHERE stripe_event_id LIKE 'evt_test_%';

-- Supprimer member_rewards de test (si la table existe encore)
DELETE FROM public.member_rewards WHERE user_id IN (
  SELECT id FROM public.user_profiles WHERE email LIKE '%test%'
);

-- Supprimer user_profiles de test
DELETE FROM public.user_profiles WHERE email LIKE '%test%';

-- Supprimer auth.users de test
DELETE FROM auth.users WHERE email LIKE '%test%';

-- 4. CRÉER UN UTILISATEUR TEST SIMPLE (sans member_rewards)
DO $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
BEGIN
  -- Générer des UUID uniques
  user_uuid := gen_random_uuid();
  profile_id := gen_random_uuid();

  -- Créer l'utilisateur auth
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    'test-simple@nowme.fr',
    crypt('motdepasse123', gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  -- Créer le profil utilisateur
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    profile_id, user_uuid, 'test-simple@nowme.fr', 'Test', 'Simple',
    '+33612345680', 'active', 'premium', now(), now()
  );

  -- PAS DE member_rewards pour l'instant !

  RAISE NOTICE 'Utilisateur test créé avec succès:';
  RAISE NOTICE '  Auth ID: %', user_uuid;
  RAISE NOTICE '  Profile ID: %', profile_id;
  RAISE NOTICE '  Email: test-simple@nowme.fr';
  RAISE NOTICE '  Password: motdepasse123';
END;
$$;

-- 5. VÉRIFIER LA CRÉATION
SELECT 
  'auth.users' as table_name,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'test-simple@nowme.fr'

UNION ALL

SELECT 
  'user_profiles' as table_name,
  user_id::text as id,
  email,
  created_at
FROM public.user_profiles 
WHERE email = 'test-simple@nowme.fr';