// supabase/functions/stripe-webhook-router/index.ts
// Webhook Stripe "production-ready" pour Supabase Edge Functions (Deno).
// - Vérification de signature HMAC (compatible Stripe)
// - Upsert idempotent par stripe_event_id
// - Journalisation complète (raw_event, erreurs)
// - Extraction champs clés: event_type, customer_id/email, subscription_id, amount, status

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- ENV ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""; // pris du Dashboard Stripe > Webhooks

const supabase =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

// --- Utils ---
function parseStripeSigHeader(sigHeader: string | null) {
  if (!sigHeader) return { t: null as string | null, v1: null as string | null };
  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.trim().split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  return { t: parts["t"] ?? null, v1: parts["v1"] ?? null };
}

async function verifyStripeSignature(rawBody: string, sigHeader: string | null, secret: string): Promise<boolean> {
  const { t, v1 } = parseStripeSigHeader(sigHeader);
  if (!t || !v1 || !secret) return false;

  const encoder = new TextEncoder();
  const signedPayload = `${t}.${rawBody}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const signature = Array.from(new Uint8Array(signatureBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

  // comparaison en "temps constant" (basique)
  if (signature.length !== v1.length) return false;
  let r = 0;
  for (let i = 0; i < signature.length; i++) r |= signature.charCodeAt(i) ^ v1.charCodeAt(i);
  return r === 0;
}

// Extraction sécurisée de champs utiles, selon le type d’event
function extractFields(event: any) {
  const obj = event?.data?.object ?? {};
  const event_type = event?.type ?? null;

  // champs communs
  let customer_id = obj.customer ?? null;
  let customer_email = obj.customer_email ?? obj.receipt_email ?? obj.customer_details?.email ?? null;
  let subscription_id = obj.subscription ?? null;
  let amount: number | null = null;
  let status = obj.status ?? null;

  // différents objets selon event.type
  // checkout.session.completed
  if (event_type === "checkout.session.completed") {
    amount = obj.amount_total ?? null;
    subscription_id = obj.subscription ?? subscription_id;
    customer_id = obj.customer ?? customer_id;
    customer_email = obj.customer_details?.email ?? customer_email;
    status = obj.payment_status ?? status;
  }

  // invoice.payment_succeeded / invoice.paid
  if (event_type?.startsWith("invoice.")) {
    amount = obj.amount_paid ?? obj.amount_due ?? amount;
    customer_id = obj.customer ?? customer_id;
    subscription_id = obj.subscription ?? subscription_id;
    status = obj.status ?? status;
  }

  // charge.succeeded
  if (event_type?.startsWith("charge.")) {
    amount = obj.amount ?? amount;
    customer_id = obj.customer ?? customer_id;
    customer_email = obj.billing_details?.email ?? customer_email;
    status = obj.status ?? status;
  }

  // customer.subscription.*
  if (event_type?.startsWith("customer.subscription.")) {
    subscription_id = obj.id ?? subscription_id;
    customer_id = obj.customer ?? customer_id;
    status = obj.status ?? status;
  }

  return { event_type, customer_id, customer_email, subscription_id, amount, status };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!supabase) {
      console.error("Supabase client not initialized — check env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ ok: false, error: "supabase_client_not_initialized" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // 1) lire le body brut pour la vérification
    const raw = await req.text();
    const sig = req.headers.get("stripe-signature");

    // 2) vérification de la signature
    let verified = false;
    if (STRIPE_WEBHOOK_SECRET) {
      verified = await verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET);
    }
    let event: any = null;
    try {
      event = raw ? JSON.parse(raw) : null;
    } catch {
      // si parsing impossible, on garde le raw
    }

    // 3) construire l’enregistrement à stocker
    const record = {
      stripe_event_id: event?.id ?? null,
      ...extractFields(event),
      raw_event: event ?? (raw ? { raw } : null),
      error: verified ? null : "signature_invalid",
      error_message: verified ? null : "Stripe signature verification failed",
    };

    // 4) upsert idempotent (si stripe_event_id présent), sinon insert simple
    let dbError: string | null = null;
    if (record.stripe_event_id) {
      const { error } = await supabase
        .from("stripe_webhook_events")
        .upsert(record, { onConflict: "stripe_event_id" });
      if (error) dbError = error.message ?? String(error);
    } else {
      const { error } = await supabase.from("stripe_webhook_events").insert(record);
      if (error) dbError = error.message ?? String(error);
    }

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ ok: false, error: dbError }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // 5) si signature invalide → 400 pour forcer Stripe à retenter
    if (!verified) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_signature" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 6) ici, tu peux router tes actions métier par event.type si besoin
    // ex: if (record.event_type === "checkout.session.completed") { ... }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error("Unhandled error:", e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || "server_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
