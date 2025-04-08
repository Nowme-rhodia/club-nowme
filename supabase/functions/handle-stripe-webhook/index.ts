import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@13.11.0';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        
        // Mettre à jour le statut de l'abonnement
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'active',
            stripe_customer_id: invoice.customer
          })
          .eq('email', customerEmail);

        if (updateError) throw updateError;
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        
        // Mettre à jour le statut à cancelled
        const { error: cancelError } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'cancelled'
          })
          .eq('stripe_customer_id', subscription.customer);

        if (cancelError) throw cancelError;
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});