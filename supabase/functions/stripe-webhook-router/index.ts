// supabase/functions/stripe-webhook-router/index.ts
// Version logger : capte l'erreur exacte et l'enregistre en base.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const supabase =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

// Vérif signature Stripe (HMAC v1) – sans dépendance externe
async function verifyStripeSignature(rawBody: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  try {
    const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, p) => {
      const [k, v] = p.trim().split("=");
      if (k && v) acc[k] = v;
      return acc;
    }, {});
    const t = parts["t"];
    const v1 = parts["v1"];
    if (!t || !v1) return false;

    const encoder = new TextEncoder();
    const signedPayload = `${t}.${rawBody}`;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const calc = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (calc.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");

  try {
    // Parse “souple” pour ne jamais crasher sur le JSON
    let evt: any = null;
    try {
      evt = raw ? JSON.parse(raw) : null;
    } catch {
      evt = { raw };
    }

    // Vérif signature (renverra 400 si invalide, mais on log en base quand même)
    const verified = await verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET);

    const record = {
      stripe_event_id: evt?.id ?? `debug-${crypto.randomUUID()}`,
      event_type: evt?.type ?? "debug.test",
      customer_id: evt?.data?.object?.customer ?? null,
      customer_email: evt?.data?.object?.customer_email ?? evt?.data?.object?.receipt_email ?? null,
      subscription_id: evt?.data?.object?.subscription ?? null,
      amount: evt?.data?.object?.amount_total ?? evt?.data?.object?.amount ?? null,
      status: evt?.data?.object?.status ?? null, // ta colonne est maintenant nullable
      raw_event: evt ?? (raw ? { raw } : null),
      error: verified ? null : "missing_or_invalid_signature",
      error_message: verified ? null : "Stripe signature verification failed",
    };

    if (!supabase) {
      return new Response(JSON.stringify({ ok: false, stage: "init", error: "supabase_client_not_initialized" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // upsert idempotent si on a un id Stripe, sinon insert
    let dbError: any = null;
    if (record.stripe_event_id && record.stripe_event_id.startsWith("evt_")) {
      const { error } = await supabase
        .from("stripe_webhook_events")
        .upsert(record, { onConflict: "stripe_event_id" });
      dbError = error;
    } else {
      const { error } = await supabase.from("stripe_webhook_events").insert(record);
      dbError = error;
    }

    if (dbError) {
      // On renvoie l’erreur claire au client (visible dans les logs Stripe)
      return new Response(JSON.stringify({ ok: false, stage: "db", error: dbError.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    // Si signature KO → 400 (pour forcer Stripe à retenter), mais on a loggé l’event en base
    if (!verified) {
      return new Response(JSON.stringify({ ok: false, stage: "sig", error: "missing_or_invalid_signature" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // OK
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    // Catch global : renvoie l’erreur exacte
    return new Response(JSON.stringify({ ok: false, stage: "unhandled", error: e?.message ?? String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
