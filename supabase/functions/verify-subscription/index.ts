import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=denonext";
import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "session_id manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Verifying session: ${session_id}`);

    // 1. Retrieve the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"]
    });

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Session non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Session found: ${session.id}, status: ${session.status}, payment_status: ${session.payment_status}`);

    // 2. Check if payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          success: false,
          status: "pending",
          message: "Paiement en cours de traitement"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get subscription details
    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ success: false, error: "Pas d'abonnement trouvé" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`📋 Subscription status: ${stripeSubscription.status}`);

    // 4. Get customer email from Stripe session
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      console.error("❌ No customer email found in session");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email client introuvable"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Customer email: ${customerEmail}`);

    // 5. Find user profile by email
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, email, first_name, last_name")
      .eq("email", customerEmail)
      .single();

    if (profileError || !userProfile) {
      console.error("❌ User profile not found:", profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Profil utilisateur introuvable",
          needsSync: true
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💾 User profile found: ${userProfile.user_id}`);

    // 6. Check if subscription already exists in DB
    const { data: existingSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (subError && subError.code !== "PGRST116") {
      console.error("❌ Error checking subscription:", subError);
    }

    // 7. Get price details from Stripe
    const priceId = stripeSubscription.items.data[0]?.price.id;
    const productId = typeof stripeSubscription.items.data[0]?.price.product === "string"
      ? stripeSubscription.items.data[0]?.price.product
      : stripeSubscription.items.data[0]?.price.product?.id;

    console.log(`📋 Price ID: ${priceId}, Product ID: ${productId}`);

    // 8. Upsert subscription in database
    if (stripeSubscription.status === "active" || stripeSubscription.status === "trialing") {
      console.log("🔄 Upserting subscription in database");

      const subscriptionData: any = {
        user_id: userProfile.user_id,
        stripe_subscription_id: subscriptionId,
        product_id: productId,
        price_id: priceId,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000).toISOString() : null,
        canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
        latest_invoice_id: stripeSubscription.latest_invoice as string || null,
        updated_at: new Date().toISOString()
      };

      // Si l'abonnement existe déjà, ajouter son ID pour l'update
      if (existingSubscription?.id) {
        subscriptionData.id = existingSubscription.id;
      }

      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(subscriptionData, {
          onConflict: "stripe_subscription_id"
        });

      if (upsertError) {
        console.error("❌ Failed to upsert subscription:", upsertError);
        console.error("❌ Subscription data:", subscriptionData);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Échec de mise à jour de l'abonnement: ${upsertError.message}`
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Subscription upserted successfully");

      // 9. Update user_profiles with Stripe customer info (subscription_status n'existe plus)
      console.log("🔄 Updating user profile with Stripe customer info for user_id:", userProfile.user_id);

      const customerPhone = session.customer_details?.phone || session.customer?.phone;

      const updateData: any = {
        stripe_customer_id: session.customer as string,
        updated_at: new Date().toISOString()
      };

      if (customerPhone) {
        console.log("📱 Found phone in Stripe session, updating profile...");
        updateData.phone = customerPhone;
      }

      console.log("📝 Update data:", updateData);

      console.log("📝 Update data:", updateData);

      const { data: updatedProfile, error: profileUpdateError } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", userProfile.user_id)
        .select();

      if (profileUpdateError) {
        console.error("❌ Failed to update user profile:", profileUpdateError);
        console.error("❌ Update was for user_id:", userProfile.user_id);
      } else {
        console.log("✅ User profile updated successfully");
        console.log("✅ Updated profile data:", updatedProfile);
      }

      console.log("ℹ️ Note: Le statut de l'abonnement est maintenant dans la table 'subscriptions', pas dans 'user_profiles'");

      // 10. Email is now handled by stripe-webhook asynchronously
      if (!existingSubscription || existingSubscription.status !== "active") {
        console.log(`ℹ️ Welcome email will be handled by stripe-webhook for ${customerEmail}`);
      }
    }

    // 7. Return verification result
    return new Response(
      JSON.stringify({
        success: true,
        status: "active",
        subscription: {
          id: subscriptionId,
          status: stripeSubscription.status,
          current_period_end: stripeSubscription.current_period_end,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end
        },
        message: "Abonnement vérifié et activé"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("🔥 Verification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erreur lors de la vérification"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
