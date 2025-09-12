// supabase/functions/stripe-webhook-router/index.ts
// MODE DEBUG : enregistre TOUS les événements, même si la signature Stripe échoue.
// -> Objectif : voir exactement le contenu reçu et pourquoi l’insert échoue.
// IMPORTANT : après debug OK, on remettra la réponse 400 en cas de signature invalide.

import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const projectRef = Deno.env.get("SUPABASE_PROJECT_ID") || "";

// Petit log des ENV présentes (sans afficher les valeurs sensibles)
console.log("ENV CHECK:", {
  has_STRIPE_SECRET_KEY: !!stripeSecretKey,
  has_STRIPE_WEBHOOK_SECRET: !!stripeWebhookSecret,
  supabaseUrl,
  has_serviceRole: !!serviceRole,
  projectRef,
});

const stripe = new Stripe(stripeSecretKey || "sk_test_dummy", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

function getSupabase() {
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });
}

function extractBasics(event: Stripe.Event) {
  const type = event.type;
  let customer_id: string | null = null;
  let customer_email: string | null = null;
  let subscription_id: string | null = null;
  let amount: number | null = null;
  let status: string | null = null;

  try {
    switch (type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        customer_id = typeof s.customer === "string" ? s.customer : (s.customer as any)?.id ?? null;
        customer_email = s.customer_details?.email ?? null;
        subscription_id = typeof s.subscription === "string" ? s.subscription : null;
        status = s.status ?? null;
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        subscription_id = sub.id;
        status = sub.status ?? null;
        customer_id = typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id ?? null;
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        customer_id = typeof pi.customer === "string" ? pi.customer : (pi.customer as any)?.id ?? null;
        amount = (pi.amount ?? null) !== null ? Number(pi.amount) : null;
        status = pi.status ?? null;
        break;
      }
    }
  } catch (e) {
    console.error("extractBasics error:", e);
  }

  return { customer_id, customer_email, subscription_id, amount, status };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  const supabase = getSupabase();

  // 1) Lire RAW body pour vérif de signature
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  console.log("Headers reçus:", { hasStripeSignatureHeader: !!sig });

  let event: Stripe.Event | null = null;
  let signatureOk = false;

  // 2) Tenter la vérification de signature
  if (sig && stripeWebhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(raw, sig, stripeWebhookSecret);
      signatureOk = true;
      console.log("✅ Signature Stripe OK. type:", event.type, "id:", event.id);
    } catch (err) {
      console.error("❌ Signature Stripe invalide:", err instanceof Error ? err.message : String(err));
    }
  } else {
    console.error("❌ Manque header signature ou STRIPE_WEBHOOK_SECRET");
  }

  // 3) Si signature invalide, ESSAYER quand même de parser le body pour le log
  if (!event) {
    try {
      const parsed = JSON.parse(raw);
      // Stripe envoie { type, id, data: { object: ... } }
      // si c’est bien un event Stripe, on le traite "best effort" pour log.
      event = parsed as Stripe.Event;
      console.log("ℹ️ Event parsé sans vérif de signature. type:", event?.type, "id:", event?.id);
    } catch (e) {
      console.error("❌ Body non JSON. raw length:", raw?.length);
    }
  }

  // 4) INSERER dans ta table quoi qu’il arrive (pour debug)
  try {
    const basics = event ? extractBasics(event) : {};
    const insertPayload: any = {
      stripe_event_id: event?.id ?? null,
      event_type: event?.type ?? "unknown",
      customer_id: (basics as any).customer_id ?? null,
      customer_email: (basics as any).customer_email ?? null,
      subscription_id: (basics as any).subscription_id ?? null,
      amount: (basics as any).amount ?? null,
      status: (basics as any).status ?? null,
      raw_event: event ?? { raw },
      error: signatureOk ? null : "signature_failed_or_missing",
      error_message: signatureOk ? null : (!sig ? "missing stripe-signature header or secret" : "verification failed"),
    };

    const { error } = await supabase.from("stripe_webhook_events").insert(insertPayload);
    if (error) {
      console.error("❌ Insert stripe_webhook_events KO:", error.message);
    } else {
      console.log("✅ Insert stripe_webhook_events OK");
    }
  } catch (e) {
    console.error("❌ Exception insert stripe_webhook_events:", e);
  }

  // 5) ROUTING (uniquement si on a un event et que la signature est OK)
  if (event && signatureOk) {
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
    }

    if (target) {
      const base = projectRef
        ? `https://${projectRef}.functions.supabase.co`
        : new URL(req.url).origin;

      const headers: Record<string, string> = { "content-type": "application/json" };
      if (serviceRole) {
        headers["Authorization"] = `Bearer ${serviceRole}`;
        headers["apikey"] = serviceRole;
      }

      try {
        const res = await fetch(`${base}/${target}`, {
          method: "POST",
          headers,
          body: JSON.stringify(event),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(`❌ Forward ${target} KO:`, text);
        } else {
          console.log(`✅ Forward ${target} OK`);
        }
      } catch (err) {
        console.error(`❌ Erreur réseau vers ${target}:`, err instanceof Error ? err.message : String(err));
      }
    } else {
      console.log("ℹ️ Event non routé (type ignoré):", event.type);
    }
  } else {
    console.log("ℹ️ Pas de routing car signature non OK ou event null");
  }

  // 6) EN MODE DEBUG → on répond 200 pour que Stripe n’insiste pas
  return new Response("DEBUG OK", { status: 200 });
});
