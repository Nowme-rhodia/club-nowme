import { loadStripe } from '@stripe/stripe-js';

// Initialiser Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// Prix Stripe - PRODUCTION
export const STRIPE_PRICES = {
  monthly: 'price_1RqkgvDaQ8XsywAvq2A06dT7',  // Prix mensuel réel
  yearly: 'price_1RqkrQDaQ8XsywAvahFQAwMA',   // Prix annuel réel
};

export const createCheckoutSession = async (planType: 'monthly' | 'yearly', userEmail?: string) => {
  try {
    const priceId = STRIPE_PRICES[planType];
    if (!priceId) {
      throw new Error(`Prix non trouvé pour le plan: ${planType}`);
    }

    const origin = window.location.origin;
    const apiUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${apiUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ 
        priceId,
        planType,
        email: userEmail,
        success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscription`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      throw error;
    }

  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create checkout session');
  }
};
