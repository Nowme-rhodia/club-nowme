/*
  # Implémentation des rôles utilisateurs

  1. Modifications
    - Ajout d'une fonction pour gérer les rôles dans auth.users
    - Mise à jour des métadonnées des utilisateurs existants
    - Ajout de politiques basées sur les rôles

  2. Sécurité
    - Utilisation de app_metadata pour stocker les rôles
    - Validation des rôles dans les politiques RLS
*/

-- Fonction pour mettre à jour les métadonnées des utilisateurs
CREATE OR REPLACE FUNCTION update_user_role()
RETURNS trigger AS $$
BEGIN
  -- Mettre à jour les métadonnées de l'utilisateur
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.partners 
        WHERE user_id = NEW.user_id
      ) THEN 
        jsonb_set(
          COALESCE(raw_app_meta_data, '{}'::jsonb),
          '{role}',
          '"partner"'
        )
      ELSE 
        jsonb_set(
          COALESCE(raw_app_meta_data, '{}'::jsonb),
          '{role}',
          '"subscriber"'
        )
    END
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour les partenaires
DROP TRIGGER IF EXISTS set_partner_role ON public.partners;
CREATE TRIGGER set_partner_role
  AFTER INSERT OR UPDATE OF user_id
  ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_user_role();

-- Trigger pour les profils utilisateurs
DROP TRIGGER IF EXISTS set_subscriber_role ON public.user_profiles;
CREATE TRIGGER set_subscriber_role
  AFTER INSERT OR UPDATE OF user_id
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_role();

-- Mise à jour des métadonnées des utilisateurs existants
DO $$ 
BEGIN
  -- Mise à jour des partenaires
  UPDATE auth.users u
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"partner"'
  )
  WHERE EXISTS (
    SELECT 1 FROM public.partners p 
    WHERE p.user_id = u.id
  );

  -- Mise à jour des abonnés
  UPDATE auth.users u
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"subscriber"'
  )
  WHERE EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.user_id = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.partners p 
    WHERE p.user_id = u.id
  );
END $$;

-- Mise à jour des politiques RLS pour utiliser les rôles
ALTER POLICY "Partners can read their own data" ON public.partners
  USING (
    auth.uid() = user_id 
    AND ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role')::text = 'partner'
  );

ALTER POLICY "Partners can insert their own data" ON public.partners
  WITH CHECK (
    auth.uid() = user_id 
    AND ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role')::text = 'partner'
  );

ALTER POLICY "Partners can update their own data" ON public.partners
  USING (
    auth.uid() = user_id 
    AND ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role')::text = 'partner'
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role')::text = 'partner'
  );

-- Fonction utilitaire pour vérifier si l'utilisateur est un service_role
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS boolean AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politiques pour le service_role
CREATE POLICY "Allow Insert from Webhook"
  ON public.user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow Update only for Service Role"
  ON public.user_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ajout de commentaires
COMMENT ON FUNCTION update_user_role() IS 'Met à jour le rôle utilisateur dans auth.users.raw_app_meta_data';
COMMENT ON FUNCTION is_service_role() IS 'Vérifie si le rôle actuel est service_role';
COMMENT ON TRIGGER set_partner_role ON public.partners IS 'Définit le rôle partenaire lors de l''insertion/mise à jour';
COMMENT ON TRIGGER set_subscriber_role ON public.user_profiles IS 'Définit le rôle abonné lors de l''insertion/mise à jour';