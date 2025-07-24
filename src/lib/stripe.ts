import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Initialiser Stripe avec une vérification de la clé
const stripePromise = (() => {
  const key = import.meta.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error('Stripe publishable key is missing');
    return Promise.resolve(null);
  }
  return loadStripe(key);
})();

// Prix Stripe pour les nouveaux plans
export const STRIPE_PRICES = {
  monthly: 'price_monthly_1299',     // 12,99€ 1er mois puis 39,99€
  yearly: 'price_yearly_39900',      // 399€ par an
};

export const createCheckoutSession = async (priceId: string) => {
  try {
    // Utiliser les nouveaux prix
    const finalPriceId = STRIPE_PRICES[priceId] || priceId;

    const origin = window.location.origin;
    
    // Vérifier que l'URL de l'API est définie
    const apiUrl = import.meta.env.SUPABASE_URL;
    if (!apiUrl) {
      throw new Error('SUPABASE_URL is not defined');
    }
    
    // Vérifier que la clé anonyme est définie
    const anonKey = import.meta.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('SUPABASE_ANON_KEY is not defined');
    }
    
    console.log('Calling Edge Function with:', { 
      priceId: finalPriceId, 
      planType: priceId,
      origin 
    });
    
    const response = await fetch(`${apiUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ 
        priceId: finalPriceId,
        planType: priceId, // 'monthly' ou 'yearly'
        origin: origin
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Checkout session creation failed:', errorData);
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    if (!sessionId) {
      throw new Error('No session ID returned from server');
    }
    
    console.log('Session created successfully:', { sessionId });
    
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      console.error('Redirect to checkout failed:', error);
      throw error;
    }

  } catch (error) {
    console.error('Checkout error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create checkout session');
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
      isAnnual: data?.subscription_type === 'yearly'
    };

  } catch (error) {
    console.error('Error checking subscription:', error);
    return null;
  }
};