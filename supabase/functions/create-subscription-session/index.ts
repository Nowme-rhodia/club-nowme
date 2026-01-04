import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { priceId, email, userId: requestUserId, success_url, cancel_url, subscription_type } = await req.json();

    if (!priceId || !email || !success_url || !cancel_url) {
      throw new Error("Paramètres manquants");
    }

    console.log("📧 Recherche du profil pour:", email, "userId:", requestUserId);

    let profile = null;

    // 1. Essayer avec userId si fourni (plus fiable)
    if (requestUserId) {
      const { data: p } = await supabase
        .from("user_profiles")
        .select("user_id, stripe_customer_id")
        .eq("user_id", requestUserId)
        .maybeSingle();
      profile = p;
    }

    // 2. Si pas trouvé, essayer avec l'email
    if (!profile) {
      console.log("⚠️ Pas trouvé par ID, essai par email...");
      const { data: p } = await supabase
        .from("user_profiles")
        .select("user_id, stripe_customer_id")
        .eq("email", email)
        .maybeSingle();
      profile = p;
    }

    if (!profile) {
      throw new Error("Profil utilisateur non trouvé. Veuillez vous inscrire d'abord.");
    }

    const userId = profile.user_id;
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

    // --- Helper: Get or Create Welcome Coupon ---
    const getOrCreateWelcomeCoupon = async () => {
      const couponId = 'WELCOME_1299';
      try {
        // Check if coupon exists
        await stripe.coupons.retrieve(couponId);
        console.log("✅ Coupon WELCOME_1299 exists");
        return couponId;
      } catch (err) {
        // If not, create it
        console.log("⚠️ Coupon WELCOME_1299 not found, creating it...");
        try {
          const coupon = await stripe.coupons.create({
            id: couponId,
            duration: 'once',
            amount_off: 2700, // 27.00€ off (39.99 - 27.00 = 12.99)
            currency: 'eur',
            name: 'Offre Bienvenue (1er mois à 12,99€)',
          });
          console.log("✅ Coupon created:", coupon.id);
          return coupon.id;
        } catch (createErr) {
          console.error("❌ Error creating coupon:", createErr);
          return null;
        }
      }
    };

    let discounts = undefined;

    // Apply discount ONLY for monthly subscription
    if (subscription_type === 'monthly') {
      const welcomeCoupon = await getOrCreateWelcomeCoupon();
      if (welcomeCoupon) {
        discounts = [{ coupon: welcomeCoupon }];
        console.log("🎟️ Applying automatic discount:", welcomeCoupon);
      }
    }

    // Créer la Checkout Session Stripe
    const sessionParams: any = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      billing_address_collection: "required",
      metadata: {
        source: "subscription",
        user_id: userId,
        subscription_type: subscription_type ?? "default",
      },
    };

    // Fix: Validates that only one of these parameters is present
    if (discounts) {
      sessionParams.discounts = discounts;
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
