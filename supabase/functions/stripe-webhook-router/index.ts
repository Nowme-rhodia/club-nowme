// supabase/functions/stripe-webhook-router/index.ts
// Route propre des événements Stripe vers les bonnes fonctions Edge
// - checkout.session.completed -> stripe-checkout-completed
// - customer.subscription.*    -> sync-stripe-subscriptions
//
// Prérequis ENV (Functions):
//  - STRIPE_SECRET_KEY
//  - STRIPE_WEBHOOK_SECRET
//  - SUPABASE_URL
//  - SUPABASE_SERVICE_ROLE_KEY

import Stripe from "npm:stripe@14.25.0";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Signature Stripe manquante", { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Vérification signature échouée:", msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  // Choix de la fonction cible
  let target = "";
  switch (event.type) {
    case "checkout.session.completed":
      target = "stripe-checkout-completed";
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      target = "sync-stripe-subscriptions";
      break;

    default:
      // On peut ignorer les autres events silencieusement
      console.log(`ℹ️ Event ignoré: ${event.type}`);
      return new Response("Ignored", { status: 200 });
  }

  // On forward l’event brut à la fonction cible (en conservant le header Stripe)
  const projectRef = Deno.env.get("SUPABASE_PROJECT_ID");
  const functionsBase = projectRef
    ? `https://${projectRef}.functions.supabase.co`
    : // fallback : même host que cette fonction
      new URL(req.url).origin;

  const url = `${functionsBase}/${target}`;
  const forwardReq = new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // On ne peut pas renvoyer la signature originale utilement (corps différent),
      // donc on transmet le payload vérifié.
    },
    body: JSON.stringify(event),
  });

  try {
    const res = await fetch(forwardReq);
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Appel ${target} a échoué:`, text);
      return new Response(`Forward to ${target} failed: ${text}`, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Erreur réseau vers ${target}:`, msg);
    return new Response(`Network error forwarding to ${target}: ${msg}`, { status: 502 });
  }

  return new Response("OK", { status: 200 });
});
