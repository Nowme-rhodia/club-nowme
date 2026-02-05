import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@^17.5.0";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Clients ------------------------------------------------------------------------
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// --- EntryPoint ---------------------------------------------------------------------
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { offerId, userId, quantity = 1, success_url, cancel_url } =
      await req.json();

    if (!offerId || !userId || !success_url || !cancel_url) {
      throw new Error("❌ Paramètres manquants (offerId, userId, urls)");
    }

    // 1) Charger l'offre + prix
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("id, partner_id, title, custom_commission_rate")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) throw new Error("❌ Offre introuvable");

    const { data: priceRow, error: priceError } = await supabase
      .from("offer_prices")
      .select("id, price, promo_price, duration")
      .eq("offer_id", offerId)
      .limit(1)
      .single();

    if (priceError || !priceRow)
      throw new Error("❌ Aucun prix trouvé pour cette offre");

    const unitAmount = priceRow.promo_price
      ? Math.round(Number(priceRow.promo_price))
      : Math.round(Number(priceRow.price));

    if (!unitAmount || unitAmount <= 0)
      throw new Error("❌ Montant de l'offre invalide");

    const totalAmount = unitAmount * quantity;
    const commissionRate = offer.custom_commission_rate ?? 0.2; // défaut 20%
    const platformFee = Math.round(totalAmount * commissionRate);
    const partnerEarnings = totalAmount - platformFee;

    // 2) Créer une réservation (booking) en "pending"
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        partner_id: offer.partner_id,
        offer_id: offer.id,
        user_id: userId,
        status: "pending",
        quantity,
        currency: "eur",
        unit_amount_cents: unitAmount,
        total_amount_cents: totalAmount,
        commission_rate: commissionRate,
        platform_fee_cents: platformFee,
        partner_earnings_cents: partnerEarnings,
        pricing_snapshot: {
          price_id: priceRow.id,
          unit_amount_cents: unitAmount,
          total_amount_cents: totalAmount,
          commission_rate: commissionRate,
        },
      })
      .select()
      .single();

    if (bookingError || !booking)
      throw new Error("❌ Impossible de créer la réservation");

    // 3) Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: offer.title },
            unit_amount: unitAmount,
          },
          quantity,
        },
      ],
      success_url,
      cancel_url,
      metadata: {
        source: "one_time",
        offer_id: offer.id,
        booking_id: booking.id,
        partner_id: offer.partner_id,
        user_id: userId,
      },
    });

    // 4) Mettre à jour la réservation avec l’ID Stripe
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", booking.id);

    if (updateError)
      throw new Error("❌ Impossible de lier la session Stripe à la réservation");

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erreur create-offer-session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
