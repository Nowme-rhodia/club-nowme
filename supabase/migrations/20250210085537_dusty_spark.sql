/*
  # Fix stripe functions search path

  1. Changes
    - Add IMMUTABLE keyword to stripe webhook functions
    - Set explicit search path
    - Add proper security settings
*/

-- Mettre à jour les fonctions avec IMMUTABLE et search_path explicite
ALTER FUNCTION handle_payment_succeeded(text, text, text, text) 
SET search_path = public, pg_temp;

ALTER FUNCTION handle_payment_failed(text, text) 
SET search_path = public, pg_temp;

ALTER FUNCTION handle_subscription_deleted(text, text) 
SET search_path = public, pg_temp;

ALTER FUNCTION handle_checkout_completed(text, text, text, text) 
SET search_path = public, pg_temp;

-- Ajouter la volatilité STABLE aux fonctions
ALTER FUNCTION handle_payment_succeeded(text, text, text, text) STABLE;
ALTER FUNCTION handle_payment_failed(text, text) STABLE;
ALTER FUNCTION handle_subscription_deleted(text, text) STABLE;
ALTER FUNCTION handle_checkout_completed(text, text, text, text) STABLE;