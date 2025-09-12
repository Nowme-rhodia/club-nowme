// supabase/functions/stripe-webhook-router/index.ts
// Vérifie la signature, enregistre TOUS les events dans la table stripe_webhook_events,
// puis route uniquement ceux utiles vers les fonctions cibles.
//
// ENV requis (Functions):
//  - STRIPE_SECRET_KEY
//  - STRIPE_WEBHOOK_SECRET
//  - SUPABASE_URL
//  - SUPABASE_SERVICE_ROLE_KEY
//  - (optionnel) SUPABASE_PROJECT_ID

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const projectRef = Deno.env.get("SUPABASE_PROJECT_ID") || "";

if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !serviceRole) {
  console.error("❌ ENV manquantes pour le router webhook.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

function getSupabaseServiceClient() {
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
    global: { headers: { "x-application-name": "stripe-webhook-router" } },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  // 1) Vérification de signature
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Signature Stripe manquante", { status: 400 });
    }
    event = stripe.webhooks.constructEvent(raw, signature, stripeWebhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Signature invalide:", msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  // 2) Insert de TOUS les events pour traçabilité
  try {
    const supabase = getSupabaseServiceClient();
    const payload = event as unknown as Record<string, unknown>;

    const { error } = await supabase.from("stripe_webhook_events").insert({
      event_id: event.id,
      type: event.type,
      payload, // JSON complet
    });
    if (error) {
      console.error("❌ Insert stripe_webhook_events échoué:", error.message);
      // On continue quand même (on ne bloque pas le webhook Stripe)
    } else {
      console.log(`✅ Event ${event.id} (${event.type}) enregistré`);
    }
  } catch (e) {
    console.error("❌ Erreur inattendue insert stripe_webhook_events:", e);
    // On continue quand même
  }

  // 3) Routing uniquement des events utiles à la souscription
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
      console.log(`ℹ️ Event ignoré côté process: ${event.type}`);
      return new Response("Logged only", { status: 200 });
  }

  // 4) Forward vers la fonction cible
  const functionsBase = projectRef
    ? `https://${projectRef}.functions.supabase.co`
    : new URL(req.url).origin;

  try {
    const res = await fetch(`${functionsBase}/${target}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Forward ${target} KO:`, text);
      return new Response(`Forward to ${target} failed: ${text}`, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Erreur réseau vers ${target}:`, msg);
    return new Response(`Network error forwarding to ${target}: ${msg}`, { status: 502 });
  } 

  return new Response("OK", { status: 200 });
});
