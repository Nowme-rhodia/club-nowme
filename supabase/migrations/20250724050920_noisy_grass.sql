-- Script pour nettoyer les politiques en double avant d'appliquer les migrations

-- Supprimer les politiques en double sur stripe_webhook_events
DROP POLICY IF EXISTS "Allow admins to read webhook events" ON public.stripe_webhook_events;
DROP POLICY IF EXISTS "Admin webhook events access" ON public.stripe_webhook_events;

-- Supprimer les autres politiques potentiellement en double
DROP POLICY IF EXISTS "Users can view their rewards" ON public.member_rewards;
DROP POLICY IF EXISTS "Service role can select profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON public.user_profiles;

-- Recréer les politiques proprement
CREATE POLICY "Admin webhook events access" ON public.stripe_webhook_events
FOR SELECT TO authenticated
USING (((auth.jwt() ->> 'app_metadata'::text))::jsonb ? 'is_admin'::text);

CREATE POLICY "Users can view their rewards" ON public.member_rewards
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Politique pour les profils utilisateur
CREATE POLICY "Service role can read profiles" ON public.user_profiles
FOR SELECT TO service_role
USING (true);