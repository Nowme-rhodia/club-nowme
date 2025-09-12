// supabase/functions/stripe-webhook-router/index.ts
// Version corrigée : stripe_event_id ne peut jamais être NULL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ENV
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// Supabase client avec service_role
const supabase = (SUPABASE_URL && SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: any = null;
  try {
    event = raw ? JSON.parse(raw) : null;
  } catch {
    event = { raw };
  }

  // ⚡ stripe_event_id ne sera jamais null
  const record = {
    stripe_event_id: event?.id ?? `debug-${crypto.randomUUID()}`,
    event_type: event?.type ?? "debug.test",
    customer_id: event?.data?.object?.customer ?? null,
    customer_email:
      event?.data?.object?.customer_email ??
      event?.data?.object?.receipt_email ??
      null,
    subscription_id: event?.data?.object?.subscription ?? null,
    amount: event?.data?.object?.amount_total ??
      event?.data?.object?.amount ??
      null,
    status: event?.data?.object?.status ?? null,
    raw_event: event ?? (raw ? { raw } : null),
    error: null as string | null,
    error_message: null as string | null,
  };

  if (!supabase) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "supabase_client_not_initialized (check SUPABASE_URL / SERVICE_ROLE_KEY)",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  // UPSERT par stripe_event_id (évite doublons Stripe)
  const { error } = await supabase
    .from("stripe_webhook_events")
    .upsert(record, { onConflict: "stripe_event_id" });

  if (error) {
    console.error("DB error:", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Si pas de header Stripe → renvoie erreur de signature (mais on log quand même)
  if (!sig) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_or_invalid_signature" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  // Réponse finale
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
