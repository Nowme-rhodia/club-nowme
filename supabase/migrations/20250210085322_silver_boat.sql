/*
  # Update Stripe webhook functions

  1. Changes
    - Refactored webhook handling functions to use new stripe_webhook_events table
    - Added logging of webhook events
    - Improved error handling
    - Added status tracking
*/

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS handle_stripe_webhook CASCADE;
DROP FUNCTION IF EXISTS handle_payment_succeeded CASCADE;
DROP FUNCTION IF EXISTS handle_payment_failed CASCADE;
DROP FUNCTION IF EXISTS handle_subscription_created CASCADE;
DROP FUNCTION IF EXISTS handle_subscription_deleted CASCADE;
DROP FUNCTION IF EXISTS handle_checkout_completed CASCADE;

-- Fonction pour gérer le paiement réussi
CREATE OR REPLACE FUNCTION handle_payment_succeeded(event_id text, customer_email text, customer_id text, subscription_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET 
    subscription_status = 'active',
    stripe_customer_id = customer_id,
    stripe_subscription_id = subscription_id
  WHERE email = customer_email;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;

-- Fonction pour gérer l'échec du paiement
CREATE OR REPLACE FUNCTION handle_payment_failed(event_id text, customer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET subscription_status = 'payment_failed'
  WHERE stripe_customer_id = customer_id;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;

-- Fonction pour gérer la suppression d'un abonnement
CREATE OR REPLACE FUNCTION handle_subscription_deleted(event_id text, customer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET subscription_status = 'cancelled'
  WHERE stripe_customer_id = customer_id;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;

-- Fonction pour gérer la complétion du checkout
CREATE OR REPLACE FUNCTION handle_checkout_completed(event_id text, customer_email text, customer_id text, subscription_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mettre à jour le profil utilisateur
  UPDATE user_profiles
  SET 
    subscription_status = 'active',
    stripe_customer_id = customer_id,
    stripe_subscription_id = subscription_id
  WHERE email = customer_email;

  -- Mettre à jour le statut de l'événement
  UPDATE stripe_webhook_events
  SET status = 'completed'
  WHERE stripe_event_id = event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Enregistrer l'erreur
    UPDATE stripe_webhook_events
    SET 
      status = 'failed',
      error = SQLERRM
    WHERE stripe_event_id = event_id;
    RAISE;
END;
$$;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION handle_payment_succeeded TO authenticated;
GRANT EXECUTE ON FUNCTION handle_payment_failed TO authenticated;
GRANT EXECUTE ON FUNCTION handle_subscription_deleted TO authenticated;
GRANT EXECUTE ON FUNCTION handle_checkout_completed TO authenticated;

-- Ajouter des commentaires
COMMENT ON FUNCTION handle_payment_succeeded IS 'Handles successful Stripe payments and updates user subscription status';
COMMENT ON FUNCTION handle_payment_failed IS 'Handles failed Stripe payments and updates user subscription status';
COMMENT ON FUNCTION handle_subscription_deleted IS 'Handles Stripe subscription cancellations';
COMMENT ON FUNCTION handle_checkout_completed IS 'Handles completed Stripe checkout sessions';