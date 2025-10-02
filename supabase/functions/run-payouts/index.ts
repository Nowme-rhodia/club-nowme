// supabase/functions/run-payouts/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

// ⚠️ On utilise la clé service_role (seule clé avec droits RLS bypass)
// Elle est injectée automatiquement par Supabase au runtime Edge Functions
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    // Appelle la fonction SQL
    const { data, error } = await supabase.rpc("generate_monthly_partner_payouts");

    if (error) {
      console.error("❌ Erreur RPC generate_monthly_partner_payouts", error);
      return new Response(
        JSON.stringify({ status: "error", message: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Payouts générés avec succès", data);

    return new Response(
      JSON.stringify({ status: "success", result: data }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Exception run-payouts", err);
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
