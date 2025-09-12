// supabase/functions/stripe-webhook-router/index.ts
// DEBUG DIAG: renvoie l'état des ENV et l'erreur exacte de l'INSERT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const supabase = (SUPABASE_URL && SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok:false, error:"method_not_allowed" }), {
      status: 405, headers: { "content-type": "application/json" }
    });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Tentative d'INSERT minimal dans stripe_webhook_events
  let insertOk = false;
  let insertError: string | null = null;

  if (!supabase) {
    insertError = "supabase_client_not_initialized (check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)";
  } else {
    const row = {
      stripe_event_id: `debug-${crypto.randomUUID()}`,
      event_type: "debug.edge-insert",
      raw_event: raw ? (() => { try { return JSON.parse(raw); } catch { return { raw }; } })() : { ping: true },
      error: null as string | null,
      error_message: null as string | null,
    };

    const { error } = await supabase.from("stripe_webhook_events").insert(row);
    if (error) {
      insertError = error.message ?? String(error);
    } else {
      insertOk = true;
    }
  }

  const body = {
    ok: true,
    env: {
      has_SUPABASE_URL: Boolean(SUPABASE_URL),
      has_SERVICE_ROLE_KEY: Boolean(SERVICE_ROLE_KEY),
      has_STRIPE_WEBHOOK_SECRET: Boolean(STRIPE_WEBHOOK_SECRET),
    },
    request: {
      has_stripe_signature_header: Boolean(sig),
      raw_length: raw?.length ?? 0,
    },
    db_insert: {
      ok: insertOk,
      error: insertError,
    },
  };

  // En mode diag on répond 200 quoi qu'il arrive
  return new Response(JSON.stringify(body), {
    status: 200, headers: { "content-type": "application/json" }
  });
});
