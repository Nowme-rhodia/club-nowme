import { loadStripe } from '@stripe/stripe-js';

// Initialiser Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// Prix Stripe - PRODUCTION (vrais Price IDs)
export const STRIPE_PRICES = {
  monthly: 'price_1RqraiDaQ8XsywAvAAmxoAFW',  // 39,99€/mois (test)
  yearly: 'price_1Rqrb6DaQ8XsywAvvF8fsaJi',   // 399€/an (test)
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

    // Prompt for email if not provided
    let email = userEmail;
    if (!email) {
      email = prompt('Entrez votre email pour continuer:');
      if (!email) {
        throw new Error('Email requis pour continuer');
      }
    }

    // Call a simplified edge function that handles user creation
    const response = await fetch(`${apiUrl}/functions/v1/create-subscription-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        priceId,
        email,
        success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscription`,
        subscription_type: planType
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la création de la session');
    }

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      throw error;
    }

  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to create checkout session');
  }
};
