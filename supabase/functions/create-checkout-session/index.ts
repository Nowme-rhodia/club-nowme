import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { offerId, userId, quantity = 1, success_url, cancel_url } = await req.json();

    if (!offerId || !userId || !success_url || !cancel_url) {
      throw new Error("Paramètres manquants");
    }

    // 1) Charger l'offre depuis Supabase
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("id, partner_id, title, promo_price")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      throw new Error("Offre introuvable");
    }

    // Prix en centimes
    const unitAmount = offer.promo_price ? Math.round(Number(offer.promo_price) * 100) : 0;
    const totalAmount = unitAmount * quantity;

    // 2) Créer une réservation (booking) en statut "unpaid"
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        partner_id: offer.partner_id,
        offer_id: offer.id,
        user_id: userId,
        date: new Date().toISOString(),
        status: "unpaid",
        quantity,
        unit_amount_cents: unitAmount,
        total_amount_cents: totalAmount,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw new Error("Impossible de créer la réservation");
    }

    // 3) Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: offer.title,
            },
            unit_amount: unitAmount,
          },
          quantity,
        },
      ],
      success_url,
      cancel_url,
      metadata: {
        offer_id: offer.id,
        booking_id: booking.id,
        partner_id: offer.partner_id,
        user_id: userId,
      },
    });

    // 4) Sauvegarder l'ID de la session Stripe dans la booking
    await supabase
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erreur création session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
