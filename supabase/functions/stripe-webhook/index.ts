
import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Méthode non autorisée', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('Signature manquante', { status: 400 });

    const buffer = await req.arrayBuffer();
    const body = new Uint8Array(await req.arrayBuffer());

let event;
try {
  event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error(`Erreur de vérification de la signature Stripe ${err.message}`);
      return new Response(`Signature webhook invalide: ${err.message}`, { status: 400 });
    }

    const eventData = {
      stripe_event_id: event.id,
      event_type: event.type,
      customer_id: event.data.object.customer || null,
      customer_email: event.data.object.customer_email || event.data.object.customer_details?.email || null,
      subscription_id: event.data.object.subscription || null,
      amount: event.data.object.amount_total || event.data.object.amount || null,
      status: 'pending',
      raw_event: JSON.stringify(event)
    };

    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert(eventData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Erreur insertion événement webhook:', insertError);
      return new Response('Erreur webhook', { status: 500 });
    }

    switch(event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Type d'événement non géré: ${event.type}`);
        break;
    }

    await supabase.from('stripe_webhook_events').update({
      status: 'completed'
    }).eq('id', webhookEvent.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Erreur non gérée:', err);
    return new Response(`Erreur interne: ${err.message}`, { status: 500 });
  }
});

async function handleCheckoutSessionCompleted(session) {
  const email = session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!existingUser) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true
    });

    if (authError || !authUser.user?.id) {
      console.error('Erreur création utilisateur auth:', authError);
      return;
    }

    await supabase.from('user_profiles').insert({
      user_id: authUser.user.id,
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      subscription_type: session.metadata?.plan || 'unknown'
    });

    const confirmLinkRes = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });

    const confirmationUrl = confirmLinkRes?.data?.action_link;
    if (confirmationUrl) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Nowme <contact@nowme.fr>',
          to: email,
          subject: 'Bienvenue sur Nowme ✨ Crée ton mot de passe',
          html: `<p>Bienvenue dans la communauté Nowme 💃</p>
                 <p>Tu peux créer ton mot de passe ici 👇</p>
                 <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>`
        })
      });
    }
  } else {
    await supabase.from('user_profiles').update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      subscription_updated_at: new Date().toISOString()
    }).eq('email', email);
  }
}

async function handleSubscriptionChange(subscription) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!profile) return;

  await supabase.from('user_profiles').update({
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_updated_at: new Date().toISOString()
  }).eq('id', profile.id);
}

async function handleSubscriptionCancelled(subscription) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!profile) return;

  await supabase.from('user_profiles').update({
    subscription_status: 'canceled',
    subscription_updated_at: new Date().toISOString()
  }).eq('id', profile.id);
}

async function handlePaymentFailed(invoice) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!profile) return;

  await supabase.from('user_profiles').update({
    subscription_status: 'past_due',
    payment_failed_at: new Date().toISOString()
  }).eq('id', profile.id);
}
