import { loadStripe } from '@stripe/stripe-js';

// Initialiser Stripe
console.log('[Stripe] Initializing with key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Present' : 'Missing');
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Prix Stripe - PRODUCTION (vrais Price IDs)
export const STRIPE_PRICES = {
  monthly: 'price_1Sow5YD3JHLNgQan3TgkmEFP',  // 39,99€/mois
  yearly: 'price_1Sow6sD3JHLNgQanDeJNmEAZ',   // 399€/an
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

    // Get current user (optionnel)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(apiUrl, anonKey);
    const { data: { user } } = await supabase.auth.getUser();

    // Utiliser l'email fourni ou celui de l'utilisateur connecté
    const email = userEmail || user?.email;
    const userId = user?.id;

    if (!email) {
      throw new Error('Email introuvable. Veuillez vous inscrire d\'abord.');
    }

    // Nettoyer le sessionStorage
    sessionStorage.removeItem('signup_email');
    sessionStorage.removeItem('signup_user_id');

    // Call edge function to create Stripe session
    const response = await fetch(`${apiUrl}/functions/v1/create-subscription-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        priceId,
        email,
        userId,
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
