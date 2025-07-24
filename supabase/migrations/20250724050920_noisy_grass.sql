-- comprehensive_rls_optimization.sql
-- Fichier complet de toutes les optimisations RLS et modifications de schéma

-- Mise à jour de l'extension pg_graphql
ALTER EXTENSION pg_graphql UPDATE;

-- Suppression des index dupliqués
DROP INDEX IF EXISTS public.idx_wellness_consultations_user;

-- Création d'index pour optimiser les recherches et les politiques RLS
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_type 
ON public.user_profiles(subscription_type);

CREATE INDEX IF NOT EXISTS idx_user_profiles_search 
ON public.user_profiles USING gin(to_tsvector('english', display_name || ' ' || bio));

-- Optimisation des fonctions d'aide avec SECURITY DEFINER et search_path vide
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_uuid AND subscription_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_partner(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_uuid AND subscription_type = 'partner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fonction de vérification d'abonnement actif
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_uuid 
    AND subscription_type IN ('premium', 'admin', 'partner')
    AND subscription_end_date > CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Suppression des fonctions webhook Stripe obsolètes
DROP FUNCTION IF EXISTS handle_stripe_webhook() CASCADE;
DROP FUNCTION IF EXISTS process_stripe_event() CASCADE;

-- Nettoyage des politiques RLS sur user_profiles
DROP POLICY IF EXISTS "Allow Insert from Webhook" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update subscription status" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow Update only for Service Role" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Partners can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin webhook event access" ON public.user_profiles;
DROP POLICY IF EXISTS "Stripe webhook access" ON public.user_profiles;

-- Création des politiques optimisées pour user_profiles
-- Politique SELECT consolidée
CREATE POLICY "User profile access" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((user_id = (select auth.uid())) OR is_partner((select auth.uid())) OR is_admin((select auth.uid())));

-- Politique UPDATE consolidée
CREATE POLICY "User profile update" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin((select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())) OR is_admin((select auth.uid())));

-- Politique INSERT pour authenticated
CREATE POLICY "Allow insert for authenticated users" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Politiques pour service_role
CREATE POLICY "Service role can insert profiles" ON public.user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read profiles" ON public.user_profiles
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update profiles" ON public.user_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete profiles" ON public.user_profiles
  FOR DELETE
  TO service_role
  USING (true);

-- Nettoyage des politiques RLS sur member_rewards
DROP POLICY IF EXISTS "Admin access to member rewards" ON public.member_rewards;
DROP POLICY IF EXISTS "User access to own rewards" ON public.member_rewards;

-- Création des politiques optimisées pour member_rewards
CREATE POLICY "Member rewards access" ON public.member_rewards
  FOR SELECT
  TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin((select auth.uid())));

CREATE POLICY "Member rewards update" ON public.member_rewards
  FOR UPDATE
  TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin((select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())) OR is_admin((select auth.uid())));

CREATE POLICY "Member rewards insert" ON public.member_rewards
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = (select auth.uid())) OR is_admin((select auth.uid())));

CREATE POLICY "Member rewards delete" ON public.member_rewards
  FOR DELETE
  TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin((select auth.uid())));

-- Politiques pour les fonctionnalités premium
DROP POLICY IF EXISTS "Premium features access" ON public.premium_features;
CREATE POLICY "Premium features access" ON public.premium_features
  FOR SELECT
  TO authenticated
  USING (has_active_subscription((select auth.uid())));

-- Politiques pour les offres partenaires
DROP POLICY IF EXISTS "Partner offers access" ON public.partner_offers;
CREATE POLICY "Partner offers access" ON public.partner_offers
  FOR SELECT
  TO authenticated
  USING (is_partner((select auth.uid())) OR is_admin((select auth.uid())));

CREATE POLICY "Partner offers management" ON public.partner_offers
  FOR ALL
  TO authenticated
  USING (is_partner((select auth.uid())) OR is_admin((select auth.uid())))
  WITH CHECK (is_partner((select auth.uid())) OR is_admin((select auth.uid())));

-- Commentaires pour documentation
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Vérifie si un utilisateur est administrateur - Optimisé avec SECURITY DEFINER';
COMMENT ON FUNCTION public.is_partner(UUID) IS 'Vérifie si un utilisateur est partenaire - Optimisé avec SECURITY DEFINER';
COMMENT ON FUNCTION public.has_active_subscription(UUID) IS 'Vérifie si un utilisateur a un abonnement actif - Optimisé avec SECURITY DEFINER';

-- Vérification finale des politiques
-- Cette partie est commentée car elle est en lecture seule et ne modifie pas la base de données
/*
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
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
*/