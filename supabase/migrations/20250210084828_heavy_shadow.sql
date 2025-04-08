/*
  # Add Stripe webhook events tracking

  1. New Tables
    - `stripe_webhook_events`
      - `id` (uuid, primary key)
      - `stripe_event_id` (text, unique)
      - `event_type` (text)
      - `customer_id` (text)
      - `customer_email` (text)
      - `subscription_id` (text)
      - `amount` (numeric)
      - `status` (text)
      - `raw_event` (jsonb)
      - `error` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create stripe_webhook_events table
CREATE TABLE stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  customer_id text,
  customer_email text,
  subscription_id text,
  amount numeric,
  status text NOT NULL DEFAULT 'pending',
  raw_event jsonb NOT NULL,
  error text,
  created_at timestamptz DEFAULT now(),
  
  -- Validation des statuts possibles
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow admins to read webhook events"
  ON stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Allow service role to insert webhook events"
  ON stripe_webhook_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow service role to update webhook events"
  ON stripe_webhook_events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_stripe_webhook_events_customer_id ON stripe_webhook_events(customer_id);
CREATE INDEX idx_stripe_webhook_events_status ON stripe_webhook_events(status);
CREATE INDEX idx_stripe_webhook_events_created_at ON stripe_webhook_events(created_at);

-- Add comments
COMMENT ON TABLE stripe_webhook_events IS 'Table for tracking Stripe webhook events';
COMMENT ON COLUMN stripe_webhook_events.stripe_event_id IS 'Unique identifier from Stripe';
COMMENT ON COLUMN stripe_webhook_events.event_type IS 'Type of Stripe event (checkout.session.completed, etc)';
COMMENT ON COLUMN stripe_webhook_events.status IS 'Current status of event processing';
COMMENT ON COLUMN stripe_webhook_events.raw_event IS 'Complete webhook payload from Stripe';