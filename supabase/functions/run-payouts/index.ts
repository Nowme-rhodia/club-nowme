import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (_req) => {
  try {
    // Appel RPC : retourne void → mais on va logguer quand même le succès
    const { error } = await supabase.rpc("generate_monthly_partner_payouts");

    if (error) {
      console.error("❌ Erreur RPC generate_monthly_partner_payouts:", error);
      return new Response(
        JSON.stringify({ status: "error", message: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Payouts mensuels générés avec succès");
    return new Response(
      JSON.stringify({ status: "success", message: "Payouts générés avec succès" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Exception run-payouts:", err);
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
