/*
  # Fix Stripe webhook events table

  1. New Tables
    - `stripe_webhook_events`
      - `id` (uuid, primary key)
      - `stripe_event_id` (text, unique)
      - `event_type` (text)
      - `customer_id` (text)
      - `customer_email` (text)
      - `subscription_id` (text)
      - `amount` (numeric)
      - `status` (text with check constraint)
      - `raw_event` (jsonb)
      - `error` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `stripe_webhook_events` table
    - Add policies for service role access
    - Add indexes for performance

  3. Changes
    - Fixed RLS policy to use proper JWT function
    - Added proper service role policies
*/

-- Création de la table
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  customer_id text,
  customer_email text,
  subscription_id text,
  amount numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  raw_event jsonb NOT NULL,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Ajout des commentaires sur les colonnes
COMMENT ON TABLE public.stripe_webhook_events IS 'Table for tracking Stripe webhook events';
COMMENT ON COLUMN public.stripe_webhook_events.stripe_event_id IS 'Unique identifier from Stripe';
COMMENT ON COLUMN public.stripe_webhook_events.event_type IS 'Type of Stripe event (checkout.session.completed, etc)';
COMMENT ON COLUMN public.stripe_webhook_events.customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN public.stripe_webhook_events.customer_email IS 'Customer email address';
COMMENT ON COLUMN public.stripe_webhook_events.subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN public.stripe_webhook_events.amount IS 'Transaction amount';
COMMENT ON COLUMN public.stripe_webhook_events.raw_event IS 'Complete webhook payload from Stripe';

-- Enable RLS
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Créer un index sur stripe_event_id
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_event_id 
ON public.stripe_webhook_events(stripe_event_id);

-- Créer un index sur created_at
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at 
ON public.stripe_webhook_events(created_at);

-- Créer un index sur status
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status 
ON public.stripe_webhook_events(status);

-- Créer un index sur customer_id
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_customer_id 
ON public.stripe_webhook_events(customer_id);

-- Créer un index sur event_type
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type 
ON public.stripe_webhook_events(event_type);

-- Politiques RLS corrigées
CREATE POLICY "Allow admins to read webhook events"
  ON public.stripe_webhook_events
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "allow_insert_for_service_role"
  ON public.stripe_webhook_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "allow_update_for_service_role"
  ON public.stripe_webhook_events
  FOR UPDATE
  TO service_role
  USING (true);