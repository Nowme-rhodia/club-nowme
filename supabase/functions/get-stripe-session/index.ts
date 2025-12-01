// Edge Function pour récupérer les détails d'une session Stripe
// Endpoint: /functions/v1/get-stripe-session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Fetching Stripe session:', session_id);

    // Récupérer la session Stripe avec tous les détails
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'subscription', 'line_items']
    });

    console.log('✅ Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      customer: session.customer,
      subscription: session.subscription,
      amount_total: session.amount_total
    });

    // Retourner les détails complets
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          customer: session.customer,
          customer_email: session.customer_details?.email,
          subscription: session.subscription,
          amount_total: session.amount_total,
          currency: session.currency,
          status: session.status,
          created: session.created,
          line_items: session.line_items?.data,
          metadata: session.metadata
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error fetching session:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to fetch session'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
