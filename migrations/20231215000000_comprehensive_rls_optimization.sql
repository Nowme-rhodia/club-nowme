-- Migration: comprehensive_rls_optimization
-- Created at: 2023-12-15T00:00:00.000Z

-- Création de la fonction exec_sql si elle n'existe pas déjà
-- Cette fonction est nécessaire pour exécuter des migrations depuis StackBlitz
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'exec_sql'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS VOID
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$;
    ';
  END IF;
END
$$;

-- 1. Création d'une table pour suivre les migrations si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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
  USING ((user_id = (SELECT auth.uid())) OR is_partner((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- Politique UPDATE consolidée
CREATE POLICY "User profile update" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- Politique INSERT pour authenticated
CREATE POLICY "Allow insert for authenticated users" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

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
  USING ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

CREATE POLICY "Member rewards update" ON public.member_rewards
  FOR UPDATE
  TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

CREATE POLICY "Member rewards insert" ON public.member_rewards
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

CREATE POLICY "Member rewards delete" ON public.member_rewards
  FOR DELETE
  TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- Politiques pour les fonctionnalités premium
DROP POLICY IF EXISTS "Premium features access" ON public.premium_features;
CREATE POLICY "Premium features access" ON public.premium_features
  FOR SELECT
  TO authenticated
  USING (has_active_subscription((SELECT auth.uid())));

-- Politiques pour les offres partenaires
DROP POLICY IF EXISTS "Partner offers access" ON public.partner_offers;
CREATE POLICY "Partner offers access" ON public.partner_offers
  FOR SELECT
  TO authenticated
  USING (is_partner((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

CREATE POLICY "Partner offers management" ON public.partner_offers
  FOR ALL
  TO authenticated
  USING (is_partner((SELECT auth.uid())) OR is_admin((SELECT auth.uid())))
  WITH CHECK (is_partner((SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

-- Commentaires pour documentation
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Vérifie si un utilisateur est administrateur - Optimisé avec SECURITY DEFINER';
COMMENT ON FUNCTION public.is_partner(UUID) IS 'Vérifie si un utilisateur est partenaire - Optimisé avec SECURITY DEFINER';
COMMENT ON FUNCTION public.has_active_subscription(UUID) IS 'Vérifie si un utilisateur a un abonnement actif - Optimisé avec SECURITY DEFINER';

-- 2. Optimisation automatique de toutes les tables avec RLS activé
DO $$
DECLARE
  table_record RECORD;
  has_user_id_column BOOLEAN;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND EXISTS (
      SELECT 1 FROM pg_tables t
      JOIN pg_catalog.pg_class c ON c.relname = t.tablename
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE t.schemaname = 'public'
      AND t.tablename = tablename
      AND c.relrowsecurity = true
    )
  LOOP
    -- Vérifier si la table a une colonne user_id ou auth_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = table_record.tablename
      AND column_name IN ('user_id', 'auth_id')
    ) INTO has_user_id_column;
    
    -- Si la table a une colonne user_id ou auth_id, créer un index dessus
    IF has_user_id_column THEN
      -- Vérifier si la colonne est user_id ou auth_id
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = table_record.tablename
        AND column_name = 'user_id'
      ) THEN
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_user_id ON public.%I(user_id)', 
                      table_record.tablename, table_record.tablename);
      ELSE
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_auth_id ON public.%I(auth_id)', 
                      table_record.tablename, table_record.tablename);
      END IF;
    END IF;
  END LOOP;
END
$$;