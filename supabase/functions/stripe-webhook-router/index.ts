// supabase/functions/stripe-webhook-router/index.ts
// Vérifie la signature Stripe, LOG l'event dans ta table "stripe_webhook_events"
// en utilisant TES colonnes, puis route vers les fonctions utiles.
//
// Colonnes détectées :
// id (uuid, défaut en DB), stripe_event_id (text), event_type (text),
// customer_id (text), customer_email (text), subscription_id (text),
// amount (numeric), status (text), raw_event (jsonb), error (text),
// error_message (text), created_at (timestamptz), role (text)
//
// ENV requis côté Functions:
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

// Helpers pour extraire quelques champs selon le type d'event
function extractBasics(event: Stripe.Event) {
  const type = event.type;
  // valeurs par défaut
  let customer_id: string | null = null;
  let customer_email: string | null = null;
  let subscription_id: string | null = null;
  let amount: number | null = null;
  let status: string | null = null;

  // On couvre les cas les plus utiles
  switch (type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      customer_id = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
      customer_email = s.customer_details?.email ?? null;
      subscription_id = typeof s.subscription === "string" ? s.subscription : null;
      status = s.status ?? null;
      // montant total: data.price unitaire * quantity si present
      // (pas toujours présent dans la session, donc on laisse null si inconnu)
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      subscription_id = sub.id;
      status = sub.status ?? null;
      // customer peut être string ou object
      customer_id = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id ?? null;
      // email pas directement sur sub → laissé null
      break;
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      customer_id = typeof pi.customer === "string" ? pi.customer : (pi.customer as any)?.id ?? null;
      amount = (pi.amount ?? null) !== null ? Number(pi.amount) : null;
      status = pi.status ?? null;
      // email pas directement sur PI
      break;
    }
    default: {
      // on laisse les defaults
    }
  }

  return { customer_id, customer_email, subscription_id, amount, status };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  // 1) Vérification de signature Stripe
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
    console.error("❌ Signature Stripe invalide:", msg);
    // On loggue aussi en DB côté "error"
    try {
      const supabase = getSupabaseServiceClient();
      await supabase.from("stripe_webhook_events").insert({
        stripe_event_id: null,
        event_type: "webhook.signature_error",
        customer_id: null,
        customer_email: null,
        subscription_id: null,
        amount: null,
        status: null,
        raw_event: null,
        error: "signature_failed",
        error_message: msg,
      });
    } catch {}
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  // 2) Insert dans TA table avec TES colonnes
  try {
    const supabase = getSupabaseServiceClient();
    const basics = extractBasics(event);

    const { error } = await supabase.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      customer_id: basics.customer_id,
      customer_email: basics.customer_email,
      subscription_id: basics.subscription_id,
      amount: basics.amount,         // numeric (en cents si PI)
      status: basics.status,
      raw_event: event as any,       // jsonb
      error: null,
      error_message: null,
      // id (uuid) et created_at sont gérés côté DB si defaults
    });

    if (error) {
      console.error("❌ Insert stripe_webhook_events échoué:", error.message);
      // On n'arrête pas Stripe, on continue le routing
    } else {
      console.log(`✅ Event ${event.id} (${event.type}) enregistré`);
    }
  } catch (e) {
    console.error("❌ Erreur inattendue insert stripe_webhook_events:", e);
    // On continue quand même
  }

  // 3) Routing des events utiles à l'abonnement
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

  // 4) Forward vers la fonction cible (si elle est protégée, on passe la service role)
  const functionsBase = projectRef
    ? `https://${projectRef}.functions.supabase.co`
    : new URL(req.url).origin;

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (serviceRole) {
    headers["Authorization"] = `Bearer ${serviceRole}`;
    headers["apikey"] = serviceRole;
  }

  try {
    const res = await fetch(`${functionsBase}/${target}`, {
      method: "POST",
      headers,
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
