import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import Stripe from 'npm:stripe@14.11.0';

// Récupération des variables d'environnement
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Initialisation des clients
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// Types pour les événements Stripe
interface StripeEvent {
  id: string;
  type: string;
  api_version: string;
  created: number;
  data: {
    object: any;
  };
}

// Fonction pour extraire les informations pertinentes d'un événement Stripe
function extractEventData(event: StripeEvent) {
  const { id, type, api_version, created, data } = event;
  const eventObj = data.object;
  
  // Valeurs par défaut
  let customerId = null;
  let customerEmail = null;
  let subscriptionId = null;
  let invoiceId = null;
  let paymentIntentId = null;
  let amount = null;
  let currency = null;
  
  // Extraction des données en fonction du type d'événement
  switch (type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      subscriptionId = eventObj.id;
      customerId = eventObj.customer;
      // Récupérer l'email du client si disponible
      if (eventObj.customer) {
        try {
          const customer = eventObj.customer_email || null;
          customerEmail = customer;
        } catch (error) {
          console.error('Erreur lors de la récupération des informations client:', error);
        }
      }
      break;
      
    case 'checkout.session.completed':
      customerId = eventObj.customer;
      customerEmail = eventObj.customer_details?.email;
      subscriptionId = eventObj.subscription;
      break;
      
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      invoiceId = eventObj.id;
      customerId = eventObj.customer;
      subscriptionId = eventObj.subscription;
      amount = eventObj.amount_paid;
      currency = eventObj.currency;
      paymentIntentId = eventObj.payment_intent;
      
      // Récupérer l'email du client si disponible
      if (eventObj.customer_email) {
        customerEmail = eventObj.customer_email;
      }
      break;
      
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      paymentIntentId = eventObj.id;
      customerId = eventObj.customer;
      amount = eventObj.amount;
      currency = eventObj.currency;
      break;
  }
  
  return {
    event_id: id,
    event_type: type,
    api_version,
    created_at: new Date(created * 1000).toISOString(),
    customer_id: customerId,
    customer_email: customerEmail,
    subscription_id: subscriptionId,
    invoice_id: invoiceId,
    payment_intent_id: paymentIntentId,
    amount,
    currency,
    metadata: eventObj.metadata || {},
    raw_event: event
  };
}

// Fonction pour mettre à jour le statut d'abonnement d'un utilisateur
async function updateUserSubscriptionStatus(event: StripeEvent) {
  const { type, data } = event;
  const eventObj = data.object;
  
  // Déterminer l'email du client
  let customerEmail = null;
  let subscriptionId = null;
  let subscriptionStatus = null;
  let priceId = null;
  let productId = null;
  let startDate = null;
  let endDate = null;
  
  try {
    switch (type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        subscriptionId = eventObj.id;
        subscriptionStatus = eventObj.status === 'active' ? 'active' : 'inactive';
        
        if (eventObj.items && eventObj.items.data && eventObj.items.data.length > 0) {
          priceId = eventObj.items.data[0].price?.id;
          productId = eventObj.items.data[0].price?.product;
        }
        
        startDate = eventObj.current_period_start ? new Date(eventObj.current_period_start * 1000).toISOString() : null;
        endDate = eventObj.current_period_end ? new Date(eventObj.current_period_end * 1000).toISOString() : null;
        
        // Récupérer l'email du client
        if (eventObj.customer) {
          try {
            const customer = await stripe.customers.retrieve(eventObj.customer);
            if (customer && !customer.deleted) {
              customerEmail = customer.email;
            }
          } catch (error) {
            console.error('Erreur lors de la récupération des informations client:', error);
          }
        }
        break;
        
      case 'customer.subscription.deleted':
        subscriptionId = eventObj.id;
        subscriptionStatus = 'cancelled';
        
        // Récupérer l'email du client
        if (eventObj.customer) {
          try {
            const customer = await stripe.customers.retrieve(eventObj.customer);
            if (customer && !customer.deleted) {
              customerEmail = customer.email;
            }
          } catch (error) {
            console.error('Erreur lors de la récupération des informations client:', error);
          }
        }
        break;
        
      case 'checkout.session.completed':
        if (eventObj.mode === 'subscription') {
          subscriptionId = eventObj.subscription;
          subscriptionStatus = 'active';
          customerEmail = eventObj.customer_details?.email;
          
          // Récupérer les détails de l'abonnement
          if (subscriptionId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
                priceId = subscription.items.data[0].price?.id;
                productId = subscription.items.data[0].price?.product;
              }
              
              startDate = subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null;
              endDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
            } catch (error) {
              console.error('Erreur lors de la récupération des détails de l\'abonnement:', error);
            }
          }
        }
        break;
    }
    
    // Mettre à jour le profil utilisateur si nous avons un email
    if (customerEmail && subscriptionStatus) {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', customerEmail)
        .single();
      
      if (userError && userError.code !== 'PGRST116') {
        console.error('Erreur lors de la recherche de l\'utilisateur:', userError);
        return;
      }
      
      if (userData) {
        const updateData: any = {
          subscription_status: subscriptionStatus,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString()
        };
        
        if (priceId) updateData.subscription_price_id = priceId;
        if (productId) updateData.subscription_product_id = productId;
        if (startDate) updateData.subscription_start_date = startDate;
        if (endDate) updateData.subscription_end_date = endDate;
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', userData.id);
        
        if (updateError) {
          console.error('Erreur lors de la mise à jour du profil utilisateur:', updateError);
        } else {
          console.log(`Statut d'abonnement mis à jour pour ${customerEmail}: ${subscriptionStatus}`);
        }
      } else {
        console.log(`Aucun utilisateur trouvé avec l'email ${customerEmail}`);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut d\'abonnement:', error);
  }
}

// Fonction principale pour traiter les webhooks
Deno.serve(async (req) => {
  try {
    // Vérifier que c'est une requête POST
    if (req.method !== 'POST') {
      return new Response('Méthode non autorisée', { status: 405 });
    }
    
    // Récupérer la signature Stripe
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Signature manquante', { status: 400 });
    }
    
    // Récupérer le corps de la requête
    const body = await req.text();
    
    // Vérifier la signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error(`Erreur de signature webhook: ${err.message}`);
      return new Response(`Erreur de signature webhook: ${err.message}`, { status: 400 });
    }
    
    // Extraire les données de l'événement
    const eventData = extractEventData(event);
    
    // Enregistrer l'événement dans la base de données
    const { data: insertData, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        event_id: eventData.event_id,
        event_type: eventData.event_type,
        api_version: eventData.api_version,
        created_at: eventData.created_at,
        customer_id: eventData.customer_id,
        customer_email: eventData.customer_email,
        subscription_id: eventData.subscription_id,
        invoice_id: eventData.invoice_id,
        payment_intent_id: eventData.payment_intent_id,
        amount: eventData.amount,
        currency: eventData.currency,
        metadata: eventData.metadata,
        raw_event: eventData.raw_event,
        status: 'received'
      });
    
    if (insertError) {
      // Si l'erreur est due à une contrainte unique, c'est probablement un doublon
      if (insertError.code === '23505') {
        console.log(`Événement déjà traité: ${eventData.event_id}`);
        return new Response('Événement déjà traité', { status: 200 });
      }
      
      console.error('Erreur lors de l\'enregistrement de l\'événement:', insertError);
      return new Response(`Erreur lors de l'enregistrement de l'événement: ${insertError.message}`, { status: 500 });
    }
    
    // Traiter l'événement en fonction de son type
    try {
      // Mettre à jour le statut de l'événement à "processing"
      await supabase
        .from('stripe_webhook_events')
        .update({ status: 'processing' })
        .eq('event_id', eventData.event_id);
      
      // Traiter les événements liés aux abonnements
      if ([
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'checkout.session.completed'
      ].includes(event.type)) {
        await updateUserSubscriptionStatus(event);
      }
      
      // Marquer l'événement comme traité avec succès
      await supabase
        .from('stripe_webhook_events')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('event_id', eventData.event_id);
      
    } catch (error) {
      console.error(`Erreur lors du traitement de l'événement ${event.type}:`, error);
      
      // Marquer l'événement comme échoué
      await supabase
        .from('stripe_webhook_events')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: error.message || 'Erreur inconnue'
        })
        .eq('event_id', eventData.event_id);
      
      // On ne renvoie pas d'erreur à Stripe pour éviter les retentatives
    }
    
    // Répondre avec succès à Stripe
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Erreur non gérée:', error);
    return new Response(`Erreur interne: ${error.message}`, { status: 500 });
  }
});