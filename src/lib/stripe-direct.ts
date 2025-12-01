// Appel direct à Stripe API depuis le client (pour debug uniquement)
// ⚠️ NE PAS UTILISER EN PRODUCTION - Utiliser les Edge Functions à la place

import { logger } from './logger';

/**
 * Vérifie une session Stripe directement via l'API
 * ⚠️ Nécessite une clé API Stripe côté client (non recommandé en prod)
 */
export async function verifyStripeSessionDirect(sessionId: string) {
  try {
    logger.payment.verification('direct-start', { sessionId });

    // Option 1: Via votre backend/Edge Function (RECOMMANDÉ)
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ session_id: sessionId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Stripe Direct', 'API error', { status: response.status, error: errorText });
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logger.payment.verification('direct-result', data);
    
    return data;
  } catch (error) {
    logger.error('Stripe Direct', 'Verification failed', error);
    throw error;
  }
}

/**
 * Récupère les détails d'une session Stripe
 * Utilise l'Edge Function pour la sécurité
 */
export async function getStripeSessionDetails(sessionId: string) {
  try {
    logger.info('Stripe Direct', 'Fetching session details', { sessionId });

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-stripe-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ session_id: sessionId })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Stripe Direct', 'Session details retrieved', data);
    
    return data;
  } catch (error) {
    logger.error('Stripe Direct', 'Failed to get session details', error);
    throw error;
  }
}

/**
 * Debug: Affiche tous les détails d'une session Stripe
 */
export async function debugStripeSession(sessionId: string) {
  console.group('🔍 Stripe Session Debug');
  console.log('Session ID:', sessionId);
  
  try {
    const details = await getStripeSessionDetails(sessionId);
    console.log('✅ Session Details:', details);
    console.log('Payment Status:', details.payment_status);
    console.log('Customer ID:', details.customer);
    console.log('Subscription ID:', details.subscription);
    console.log('Amount Total:', details.amount_total / 100, '€');
    console.groupEnd();
    return details;
  } catch (error) {
    console.error('❌ Error:', error);
    console.groupEnd();
    throw error;
  }
}
