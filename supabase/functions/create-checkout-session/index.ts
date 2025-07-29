import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@13.11.0';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
function createSupabaseClient(authHeader) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader || '' }
    }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId, origin } = await req.json();
    
    if (!priceId) {
      throw new Error('Price ID is required');
    }

    // Get user information from auth header
    const authHeader = req.headers.get('Authorization');
    let userEmail = null;
    let userId = null;
    
    if (authHeader) {
      const supabase = createSupabaseClient(authHeader);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        userId = user.id;
        userEmail = user.email;
        
        console.log(`Creating checkout session for user: ${userId}, email: ${userEmail}`);
      }
    }

    // Create checkout session with improved metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin || req.headers.get('origin')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin || req.headers.get('origin')}/subscription`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: {
        enabled: true,
      },
      // Add customer email if available
      ...(userEmail ? { customer_email: userEmail } : {}),
      // Add metadata for better tracking
      metadata: {
        user_id: userId || 'anonymous',
        source: 'nowme-website',
        created_at: new Date().toISOString()
      }
    });

    // Log the session creation
    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400 
      }
    );
  }
});