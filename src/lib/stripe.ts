import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Nouveaux prix Stripe pour le modèle découverte
export const STRIPE_PRICES = {
  discovery: 'price_discovery_1299', // 12,99€ pour le 1er mois
  premium: 'price_premium_3999',     // 39,99€ à partir du 2ème mois
};

export const createCheckoutSession = async (priceId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in to subscribe');

    // Utiliser le prix découverte par défaut
    const finalPriceId = priceId === 'discovery' ? STRIPE_PRICES.discovery : priceId;

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ 
        priceId: finalPriceId,
        isDiscovery: priceId === 'discovery'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe failed to initialize');

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) throw error;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('subscription_status, stripe_subscription_id, subscription_type, created_at')
      .eq('user_id', session.user.id)
      .single();

    if (error) throw error;
    return {
      status: data?.subscription_status,
      type: data?.subscription_type,
      isFirstMonth: data?.created_at && new Date(data.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };

  } catch (error) {
    console.error('Error checking subscription:', error);
    return null;
  }
};