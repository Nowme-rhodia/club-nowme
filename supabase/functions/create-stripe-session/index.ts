
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Clé secrète Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

// Client Supabase
const supabase = createClient(
  Deno.env.get("VITE_SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { email, plan, success_url, cancel_url } = await req.json();

    if (!email || !plan || !success_url || !cancel_url) {
      return new Response("Champs manquants", { status: 400 });
    }

    // Associer les plans aux Price IDs
    const priceMap: Record<string, string> = {
      monthly: "price_1RqkgvDaQ8XsywAvq2A06dT7",
      yearly: "price_1RqkrQDaQ8XsywAvahFQAwMA",
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return new Response("Plan inconnu", { status: 400 });
    }

    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erreur dans create-stripe-session:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
    });
  }
});
