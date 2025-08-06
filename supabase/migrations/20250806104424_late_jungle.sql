/*
  # Create pending signups table and fix permissions

  1. New Tables
    - `pending_signups`
      - `id` (bigint, primary key, auto-increment)
      - `email` (text, not null)
      - `stripe_customer_id` (text)
      - `stripe_subscription_id` (text)
      - `subscription_type` (text)
      - `amount_paid` (integer)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `pending_signups` table
    - Add policy for admin access only
    - Fix permissions on `member_rewards` table

  3. Indexes
    - Add indexes for email and customer_id lookups
*/

-- Créer la table pending_signups si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.pending_signups (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_type text,
  amount_paid integer,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Ajouter des index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_pending_signups_email ON public.pending_signups(email);
CREATE INDEX IF NOT EXISTS idx_pending_signups_customer ON public.pending_signups(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pending_signups_status ON public.pending_signups(status);

-- Activer RLS
ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour que seuls les admins puissent voir/modifier
CREATE POLICY "Admins can manage pending signups" 
  ON public.pending_signups 
  FOR ALL
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND subscription_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND subscription_type = 'admin'
    )
  );

-- Politique pour service_role (pour les edge functions)
CREATE POLICY "Service role can manage pending signups"
  ON public.pending_signups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Vérifier et corriger les permissions sur member_rewards
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_rewards TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ajouter une politique service_role pour member_rewards si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'member_rewards' 
    AND policyname = 'Service role can manage rewards'
  ) THEN
    CREATE POLICY "Service role can manage rewards"
      ON public.member_rewards
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;