/// <reference lib="deno.ns" />
import { createClient } from "@supabase/supabase-js";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";

// --- ENV ----------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// --- CLIENTS ------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

console.log("🚀 stripe-webhook boot");

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
  const { error: insertErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: evt.id,
      event_type: evt.type,
      status: "processing",
      raw_event: (evt as unknown) as Record<string, unknown>,
      received_at: new Date().toISOString(),
    })
    .onConflict("stripe_event_id")
    .ignore();

  if (insertErr && !/duplicate key/i.test(insertErr.message)) {
    console.error("❌ ensureEventLogged insertErr:", insertErr.message);
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
async function handleCheckoutSessionCompleted(evt: Stripe.Event) {
  const rawSession = evt.data.object as Stripe.Checkout.Session;
  const session = await stripe.checkout.sessions.retrieve(rawSession.id, {
    expand: ["payment_intent", "subscription", "line_items.data.price.product"],
  });

  const mode = session.mode;
  const meta = session.metadata ?? {};

  if (mode === "payment") {
    const bookingId = meta.booking_id;
    if (!bookingId) return console.warn("⚠️ Missing booking_id metadata");

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id ?? null;

    const { error } = await supabase.from("bookings").update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: customerId,
      status: "requires_payment",
      updated_at: new Date().toISOString(),
    }).eq("id", bookingId);

    if (error) throw new Error("bookings update failed: " + error.message);
  }

  if (mode === "subscription") {
    const sub =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : (session.subscription as Stripe.Subscription | null);

    const stripeSubId =
      typeof session.subscription === "string" ? session.subscription : sub?.id ?? null;
    const userId = meta.user_id ?? null;

    if (!stripeSubId || !userId) return console.warn("⚠️ Missing subscription metadata");

    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_subscription_id: stripeSubId,
        product_id: sub?.items?.data?.[0]?.price?.product?.toString() ?? null,
        price_id: sub?.items?.data?.[0]?.price?.id ?? null,
        status: "incomplete",
        current_period_start: toIsoOrNull(sub?.current_period_start ?? null),
        current_period_end: toIsoOrNull(sub?.current_period_end ?? null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );

    if (error) throw new Error("subscriptions upsert failed: " + error.message);
  }
}

async function handlePaymentIntentSucceeded(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const chargeId = pi.charges.data?.[0]?.id ?? null;
  const paymentMethod = typeof pi.payment_method === "string" ? pi.payment_method : null;
  const customerId = typeof pi.customer === "string" ? pi.customer : null;

  const { error } = await supabase.from("bookings").update({
    status: "paid",
    stripe_charge_id: chargeId,
    stripe_payment_method: paymentMethod,
    stripe_customer_id: customerId,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("stripe_payment_intent_id", pi.id);

  if (error) throw new Error("bookings update on succeeded failed: " + error.message);
}

async function handlePaymentIntentProcessing(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const { error } = await supabase.from("bookings").update({
    status: "processing",
    updated_at: new Date().toISOString(),
  }).eq("stripe_payment_intent_id", pi.id);

  if (error) throw new Error("bookings update on processing failed: " + error.message);
}

async function handlePaymentIntentFailed(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const { error } = await supabase.from("bookings").update({
    status: "failed",
    updated_at: new Date().toISOString(),
  }).eq("stripe_payment_intent_id", pi.id);

  if (error) throw new Error("bookings update on failed failed: " + error.message);
}

async function handlePaymentIntentCanceled(evt: Stripe.Event) {
  const pi = evt.data.object as Stripe.PaymentIntent;
  const { error } = await supabase.from("bookings").update({
    status: "cancelled",
    updated_at: new Date().toISOString(),
  }).eq("stripe_payment_intent_id", pi.id);

  if (error) throw new Error("bookings update on canceled failed: " + error.message);
}

async function handleInvoicePaymentSucceeded(evt: Stripe.Event) {
  const invoice = evt.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const sub =
    typeof invoice.subscription === "string"
      ? await stripe.subscriptions.retrieve(invoice.subscription)
      : (invoice.subscription as Stripe.Subscription);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      stripe_subscription_id: sub.id,
      latest_invoice_id: invoice.id,
      latest_payment_intent_id:
        typeof invoice.payment_intent === "string" ? invoice.payment_intent : null,
      product_id: sub.items?.data?.[0]?.price?.product?.toString() ?? null,
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
      status: "active",
      current_period_start: toIsoOrNull(sub.current_period_start),
      current_period_end: toIsoOrNull(sub.current_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (error) throw new Error("subscriptions upsert on invoice succeeded failed: " + error.message);
}

async function handleInvoicePaymentFailed(evt: Stripe.Event) {
  const invoice = evt.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const { error } = await supabase.from("subscriptions").update({
    status: "past_due",
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", invoice.subscription as string);

  if (error) throw new Error("subscriptions update on invoice failed failed: " + error.message);
}

async function handleCustomerSubscriptionLifecycle(evt: Stripe.Event) {
  const sub = evt.data.object as Stripe.Subscription;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      stripe_subscription_id: sub.id,
      status: sub.status,
      current_period_start: toIsoOrNull(sub.current_period_start),
      current_period_end: toIsoOrNull(sub.current_period_end),
      cancel_at: toIsoOrNull(sub.cancel_at ?? null),
      canceled_at: toIsoOrNull(sub.canceled_at ?? null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (error) throw new Error("subscriptions upsert lifecycle failed: " + error.message);
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
    if (req.method !== "POST")
      return new Response("Method Not Allowed", { status: 405 });

    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Bad Request", { status: 400 });

    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    const status = await ensureEventLogged(event);
    if (status === "completed") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await dispatch(event);
      await markEventStatus(event.id, "completed");
    } catch (err: any) {
      console.error("❌ Handler error:", err.message);
      await markEventStatus(event.id, "failed", err.message);
      return new Response("Handler failed", { status: 500 }); // Stripe retry
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("🔥 Unhandled webhook error:", err.message);
    return new Response("Internal Error", { status: 500 });
  }
});
