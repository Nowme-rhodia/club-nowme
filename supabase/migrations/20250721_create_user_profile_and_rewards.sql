/*
  # Création automatique des profils utilisateurs et du programme de fidélité

  1. Fonctions
    - `create_user_profile` : Crée automatiquement une entrée dans `user_profiles` à la création d'un compte
    - `create_member_rewards` : Crée automatiquement une entrée dans `member_rewards` après création d’un profil

  2. Triggers
    - `on_auth_user_created` : Lance `create_user_profile` après ajout dans `auth.users`
    - `on_user_profile_created` : Lance `create_member_rewards` après ajout dans `user_profiles`
*/

-- Fonction pour créer automatiquement un profil utilisateur
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id, email, subscription_type, first_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    'discovery',
    'Invitée'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger : quand un user est créé dans auth.users → créer son profil
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Fonction pour créer automatiquement les rewards
CREATE OR REPLACE FUNCTION create_member_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level, last_activity_date
  )
  VALUES (
    NEW.user_id, 0, 0, 100, 'bronze', now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger : quand un user_profiles est créé → créer ses rewards
CREATE TRIGGER on_user_profile_created
AFTER INSERT ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION create_member_rewards();
