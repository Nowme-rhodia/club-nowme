/*
  # Fix stripe webhook search path

  1. Changes
    - Add search_path parameter to stripe webhook functions
    - Fix security settings
*/

-- Mettre à jour les fonctions avec le bon search_path
ALTER FUNCTION handle_payment_succeeded SET search_path = public;
ALTER FUNCTION handle_payment_failed SET search_path = public;
ALTER FUNCTION handle_subscription_deleted SET search_path = public;
ALTER FUNCTION handle_checkout_completed SET search_path = public;

-- Ajouter SECURITY DEFINER pour plus de sécurité
ALTER FUNCTION handle_payment_succeeded SECURITY DEFINER;
ALTER FUNCTION handle_payment_failed SECURITY DEFINER;
ALTER FUNCTION handle_subscription_deleted SECURITY DEFINER;
ALTER FUNCTION handle_checkout_completed SECURITY DEFINER;