import { serve } from "std/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// Supabase (service role)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, userId, email, success_url, cancel_url, subscription_type } = await req.json();

    if (!priceId || !userId || !email || !success_url || !cancel_url) {
      throw new Error("Paramètres manquants");
    }

    // Vérifier si l'utilisateur a déjà un stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profil utilisateur introuvable");
    }

    let customerId = profile.stripe_customer_id;

    // Si pas encore de customer Stripe → en créer un
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id: userId },
      });

      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);

      if (updateError) {
        throw new Error("Impossible de mettre à jour le profil utilisateur");
      }
    }

    // Créer la Checkout Session Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: {
        source: "subscription",
        user_id: userId,
        subscription_type: subscription_type ?? "default",
      },
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erreur création session subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
