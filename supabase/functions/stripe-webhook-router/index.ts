// supabase/functions/stripe-webhook-router/index.ts
import Stripe from 'npm:stripe@14.25.0';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 });
  }

  const rawBody = await req.text();
  let event;

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Signature Stripe manquante', { status: 400 });
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    console.log(`✅ Événement reçu : ${event.type}`);
  } catch (err) {
    console.error('❌ Erreur de signature Stripe :', err.message);
    return new Response(`Erreur signature : ${err.message}`, { status: 400 });
  }

  // 🔀 Détermination de la fonction cible
  let targetFunction = '';
  switch (event.type) {
    case 'checkout.session.completed':
      targetFunction = 'stripe-checkout-completed';
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      targetFunction = 'stripe-subscription-updated';
      break;
    case 'customer.subscription.deleted':
      targetFunction = 'stripe-subscription-cancelled';
      break;
    case 'invoice.payment_failed':
      targetFunction = 'stripe-payment-failed';
      break;
    default:
      console.log(`⚠️ Événement non géré : ${event.type}`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
  }

  // Reposter le body à la fonction cible
  const url = new URL(req.url);
  const forwardUrl = `${url.origin}/functions/v1/${targetFunction}`;

  const response = await fetch(forwardUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': req.headers.get('stripe-signature') || '',
    },
    body: rawBody,
  });

  const responseBody = await response.text();

  return new Response(responseBody, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  });
});
