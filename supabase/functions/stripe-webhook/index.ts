/// <reference lib="deno.ns" />

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import Stripe from "npm:stripe@13.11.0";

// --- ENV ----------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

// Support multi-secrets : Dashboard + CLI
const STRIPE_WEBHOOK_SECRETS = [
  Deno.env.get("STRIPE_WEBHOOK_SECRET_DASHBOARD")!,
  Deno.env.get("STRIPE_WEBHOOK_SECRET_CLI")!,
].filter(Boolean);

// --- CLIENTS ------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

console.info("🚀 stripe-webhook boot");

// --- HELPERS ------------------------------------------------------------------------
async function markEventStatus(
  eventId: string,
  status: "processing" | "completed" | "failed",
  errorMessage?: string
) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      status,
      error_message: errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", eventId);

  if (error) console.error("❌ markEventStatus error:", error.message);
}

async function ensureEventLogged(evt: Stripe.Event) {
  const { error: upsertErr } = await supabase
    .from("stripe_webhook_events")
    .upsert(
      {
        stripe_event_id: evt.id,
        event_type: evt.type,
        status: "processing",
        raw_event: evt as unknown as Record<string, unknown>,
        received_at: new Date().toISOString(),
      },
      { onConflict: "stripe_event_id" }
    );

  if (upsertErr) {
    console.error("❌ ensureEventLogged upsertErr:", upsertErr.message);
  }

  const { data: existing, error } = await supabase
    .from("stripe_webhook_events")
    .select("status")
    .eq("stripe_event_id", evt.id)
    .maybeSingle();

  if (error) console.error("⚠️ ensureEventLogged selectErr:", error.message);
  return existing?.status ?? null;
}

function toIsoOrNull(ts?: number | null) {
  return ts ? new Date(ts * 1000).toISOString() : null;
}


// --- HANDLERS -----------------------------------------------------------------------
// --- Checkout Session Completed ---
async function handleCheckoutSessionCompleted(evt: Stripe.Event) {
  const rawSession = evt.data.object as Stripe.Checkout.Session;

  // 1) Récupérer la session
  const session = await stripe.checkout.sessions.retrieve(rawSession.id, {
    expand: ["payment_intent", "subscription"],
  });

  // 2) Récupérer les line_items (sécurisé)
  let lineItems: Stripe.ApiList<Stripe.LineItem> | null = null;
  try {
    lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
    });
  } catch (err) {
    console.warn("⚠️ Impossible de charger les line_items:", err);
  }

  // ✅ Sécurité supplémentaire : fallback []
  const safeLineItems = Array.isArray(lineItems?.data) ? lineItems.data : [];
  console.log("📦 Line items reçus:", safeLineItems.length);

  const mode = session.mode;
  const meta = session.metadata ?? {};

  // --- Paiement one-time ---
  if (mode === "payment") {
    const bookingId = meta.booking_id;
    if (!bookingId) {
      console.warn("⚠️ Missing booking_id metadata");
      return;
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id ?? null;

    const { error } = await supabase
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: customerId,
        status: "requires_payment", // confirmation définitive au payment_intent.succeeded
        line_items_snapshot: safeLineItems,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw new Error("bookings update failed: " + error.message);
  }

  // --- Abonnement ---
  if (mode === "subscription") {
    const sub =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : (session.subscription as Stripe.Subscription | null);

    const stripeSubId =
      typeof session.subscription === "string"
        ? session.subscription
        : sub?.id ?? null;
    const userId = meta.user_id ?? null;

    if (!stripeSubId || !userId) {
      console.warn("⚠️ Missing subscription metadata");
      return;
    }

    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_subscription_id: stripeSubId,
        product_id: sub?.items?.data?.[0]?.price?.product?.toString() ?? null,
        price_id: sub?.items?.data?.[0]?.price?.id ?? null,
        status: "incomplete", // sera mis à jour via invoice.payment_succeeded
        current_period_start: toIsoOrNull(sub?.current_period_start ?? null),
        current_period_end: toIsoOrNull(sub?.current_period_end ?? null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );

    if (error) throw new Error("subscriptions upsert failed: " + error.message);
  }
}

// --- Paiement réussi ---
async function handlePaymentIntentSucceeded(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;

  // 🔎 Récupérer booking_id si présent dans metadata
  const bookingId = (pi.metadata?.booking_id as string) ?? null;

  // ✅ Récupérer le dernier charge de façon sûre
  let chargeId: string | null = null;
  if (pi.latest_charge && typeof pi.latest_charge === "string") {
    try {
      const charge = await stripe.charges.retrieve(pi.latest_charge);
      chargeId = charge.id ?? null;
    } catch (e) {
      console.warn("⚠️ Could not retrieve latest_charge:", e);
    }
  }

  const paymentMethod =
    typeof pi.payment_method === "string" ? pi.payment_method : null;

  const customerId = typeof pi.customer === "string" ? pi.customer : null;

  // --- Étape 1 : update via payment_intent_id
  let { error, count } = await supabase
    .from("bookings")
    .update({
      status: "paid",
      stripe_charge_id: chargeId,
      stripe_payment_method: paymentMethod,
      stripe_customer_id: customerId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id)
    .select("id", { count: "exact" });

  if (error) {
    throw new Error("bookings update on succeeded failed: " + error.message);
  }

  // --- Étape 2 : fallback si aucun booking trouvé, via metadata.booking_id
  if ((count ?? 0) === 0 && bookingId) {
    const { error: fallbackError } = await supabase
      .from("bookings")
      .update({
        status: "paid",
        stripe_payment_intent_id: pi.id,
        stripe_charge_id: chargeId,
        stripe_payment_method: paymentMethod,
        stripe_customer_id: customerId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (fallbackError) {
      throw new Error(
        "bookings fallback update failed: " + fallbackError.message
      );
    }
  }
}

// --- Paiement en cours ---
async function handlePaymentIntentProcessing(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id);

  if (error)
    throw new Error("bookings update on processing failed: " + error.message);
}

// --- Paiement échoué ---
async function handlePaymentIntentFailed(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id);

  if (error)
    throw new Error("bookings update on failed failed: " + error.message);
}

// --- Paiement annulé ---
async function handlePaymentIntentCanceled(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id);

  if (error)
    throw new Error("bookings update on canceled failed: " + error.message);
}

// --- Facture payée (abonnement actif) ---
async function handleInvoicePaymentSucceeded(evt: Stripe.Event) {
  const invoice = evt.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : (invoice.subscription as Stripe.Subscription).id;

  const sub =
    typeof invoice.subscription === "string"
      ? await stripe.subscriptions.retrieve(subId)
      : (invoice.subscription as Stripe.Subscription);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      latest_invoice_id: invoice.id,
      latest_payment_intent_id:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : null,
      product_id: sub.items?.data?.[0]?.price?.product?.toString() ?? null,
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
      status: "active",
      current_period_start: toIsoOrNull(sub.current_period_start),
      current_period_end: toIsoOrNull(sub.current_period_end),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subId);

  if (error) {
    throw new Error(
      "subscriptions update on invoice succeeded failed: " + error.message
    );
  }
}
// --- Facture échouée (abonnement past_due) ---
async function handleInvoicePaymentFailed(evt: Stripe.Event) {
  const invoice = evt.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", invoice.subscription as string);

  if (error)
    throw new Error(
      "subscriptions update on invoice failed failed: " + error.message
    );
}

// --- Lifecycle subscription ---
async function handleCustomerSubscriptionLifecycle(evt: Stripe.Event) {
  const sub = evt.data.object as Stripe.Subscription;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: sub.status,
      current_period_start: toIsoOrNull(sub.current_period_start),
      current_period_end: toIsoOrNull(sub.current_period_end),
      cancel_at: toIsoOrNull(sub.cancel_at ?? null),
      canceled_at: toIsoOrNull(sub.canceled_at ?? null),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    throw new Error(
      "subscriptions update lifecycle failed: " + error.message
    );
  }
}

// --- DISPATCH -----------------------------------------------------------------------
async function dispatch(evt: Stripe.Event) {
  switch (evt.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(evt);
    case "payment_intent.succeeded":
      return handlePaymentIntentSucceeded(evt);
    case "payment_intent.processing":
      return handlePaymentIntentProcessing(evt);
    case "payment_intent.payment_failed":
      return handlePaymentIntentFailed(evt);
    case "payment_intent.canceled":
      return handlePaymentIntentCanceled(evt);
    case "invoice.payment_succeeded":
      return handleInvoicePaymentSucceeded(evt);
    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(evt);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
      return handleCustomerSubscriptionLifecycle(evt);
    default:
      console.log("ℹ️ Unhandled event:", evt.type);
  }
}

// --- ENTRYPOINT ---------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      console.warn("⚠️ Missing stripe-signature header");
      return new Response("Bad Request", { status: 400 });
    }

    console.info("stripe-signature present, length:", sig.length);

    const rawBody = await req.text();
    let event: Stripe.Event | null = null;
    let lastErr: any = null;

    // 🔑 Essayer chaque secret
    for (const secret of STRIPE_WEBHOOK_SECRETS) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          rawBody,
          sig,
          secret
        );
        break; // si succès, on arrête
      } catch (err) {
        lastErr = err;
      }
    }

    if (!event) {
      console.error("❌ Invalid signature with all secrets:", lastErr?.message);
      return new Response("Invalid signature", { status: 400 });
    }

    const status = await ensureEventLogged(event);
    if (status === "completed") {
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      await dispatch(event);
      await markEventStatus(event.id, "completed");
    } catch (err: any) {
      console.error("❌ Handler error:", err?.message ?? err);
      await markEventStatus(event.id, "failed", err?.message ?? String(err));
      return new Response("Handler failed", { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("🔥 Unhandled webhook error:", err?.message ?? err);
    return new Response("Internal Error", { status: 500 });
  }
});
