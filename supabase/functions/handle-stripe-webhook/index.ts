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
  
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing Stripe signature' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extraire les informations importantes de l'événement
    const eventData = {
      stripe_event_id: event.id,
      event_type: event.type,
      customer_id: null,
      customer_email: null,
      subscription_id: null,
      raw_event: event,
      status: 'received'
    };
    
    // Extraire les informations spécifiques selon le type d'événement
    switch (event.type) {
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        eventData.customer_id = invoice.customer;
        eventData.customer_email = invoice.customer_email;
        eventData.subscription_id = invoice.subscription;
        break;
        
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        const subscription = event.data.object;
        eventData.customer_id = subscription.customer;
        eventData.subscription_id = subscription.id;
        
        // Récupérer l'email du client depuis Stripe si nécessaire
        if (typeof subscription.customer === 'string') {
          try {
            const customer = await stripe.customers.retrieve(subscription.customer);
            if (customer && !customer.deleted) {
              eventData.customer_email = customer.email;
            }
          } catch (error) {
            console.error('Error fetching customer:', error);
          }
        }
        break;
        
      case 'checkout.session.completed':
        const session = event.data.object;
        eventData.customer_id = session.customer;
        eventData.customer_email = session.customer_details?.email;
        eventData.subscription_id = session.subscription;
        break;
    }
    
    // Enregistrer l'événement dans la base de données
    const { error: logError } = await supabase
      .from('stripe_webhook_events')
      .insert(eventData);
      
    if (logError) {
      console.error('Error logging webhook event:', logError);
    }
    
    // Traiter l'événement
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          
          if (invoice.subscription) {
            // Mettre à jour le statut de l'abonnement
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                subscription_status: 'active',
                stripe_customer_id: invoice.customer,
                stripe_subscription_id: invoice.subscription,
                subscription_updated_at: new Date().toISOString()
              })
              .eq('email', invoice.customer_email);
    
            if (updateError) throw updateError;
          }
          break;
    
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          
          // Mettre à jour le statut à cancelled
          const { error: cancelError } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'cancelled',
              subscription_updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', subscription.customer);
    
          if (cancelError) throw cancelError;
          break;
          
        case 'checkout.session.completed':
          const session = event.data.object;
          
          if (session.mode === 'subscription' && session.subscription) {
            // Mettre à jour le profil utilisateur avec les informations d'abonnement
            const { error: checkoutError } = await supabase
              .from('user_profiles')
              .update({
                subscription_status: 'active',
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                subscription_updated_at: new Date().toISOString()
              })
              .eq('email', session.customer_details?.email);
              
            if (checkoutError) throw checkoutError;
          }
          break;
          
        case 'customer.subscription.updated':
          const updatedSub = event.data.object;
          
          // Mettre à jour le statut en fonction du statut de l'abonnement
          let status = 'active';
          if (updatedSub.status === 'canceled' || updatedSub.status === 'unpaid' || updatedSub.status === 'incomplete_expired') {
            status = 'cancelled';
          } else if (updatedSub.status === 'past_due') {
            status = 'past_due';
          } else if (updatedSub.status === 'trialing') {
            status = 'trial';
          }
          
          const { error: updateSubError } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: status,
              subscription_updated_at: new Date().toISOString()
            })
            .eq('stripe_customer_id', updatedSub.customer);
            
          if (updateSubError) throw updateSubError;
          break;
      }
      
      // Mettre à jour le statut de l'événement à "completed"
      await supabase
        .from('stripe_webhook_events')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('stripe_event_id', event.id);
        
    } catch (processingError) {
      console.error('Error processing webhook:', processingError);
      
      // Mettre à jour le statut de l'événement à "failed" avec l'erreur
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          status: 'failed', 
          error: processingError.message,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_event_id', event.id);
        
      throw processingError;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Si possible, enregistrer l'erreur dans la base de données
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from('stripe_webhook_events')
        .insert({
          stripe_event_id: `error_${Date.now()}`,
          event_type: 'error',
          raw_event: { error: error.message },
          status: 'failed',
          error: error.message
        });
    } catch (dbError) {
      console.error('Error logging webhook error:', dbError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});