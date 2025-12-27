-- Script pour activer manuellement l'abonnement d'un utilisateur de test
-- Remplacez 'test_client@nowme.io' par l'email que vous avez utilisé lors de l'inscription

UPDATE public.user_profiles
SET 
  subscription_status = 'active',
  role = 'subscriber',
  subscription_plan = 'monthly',
  is_admin = false
WHERE email = 'test_client@nowme.io'; -- <<< METTEZ VOTRE EMAIL ICI SI DIFFERENT

-- Vérification
SELECT email, subscription_status FROM public.user_profiles WHERE email = 'test_client@nowme.io';
