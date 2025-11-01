import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";

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

    // 4. Check database for subscription
    const { data: dbSubscription, error: dbError } = await supabase
      .from("subscriptions")
      .select("*, user_profiles!inner(email, first_name, id)")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (dbError) {
      console.error("❌ Database error:", dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Abonnement non trouvé en base de données",
          needsSync: true 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💾 Database subscription found, status: ${dbSubscription.status}`);

    // 5. If subscription is active but status in DB is not, update it
    if (stripeSubscription.status === "active" && dbSubscription.status !== "active") {
      console.log("🔄 Syncing subscription status to active");
      
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscriptionId);

      if (updateError) {
        console.error("❌ Failed to update subscription:", updateError);
      }

      // 6. TRIGGER WELCOME EMAIL if not already sent
      const userProfile = dbSubscription.user_profiles;
      if (userProfile?.email) {
        console.log(`📧 Triggering welcome email for ${userProfile.email}`);
        
        try {
          const { error: emailError } = await supabase.functions.invoke(
            "stripe-user-welcome",
            {
              body: {
                email: userProfile.email,
                firstName: userProfile.first_name || "",
                redirectTo: "https://club.nowme.fr/update-password"
              }
            }
          );

          if (emailError) {
            console.error("❌ Failed to send welcome email:", emailError);
          } else {
            console.log("✅ Welcome email triggered successfully");
          }
        } catch (emailErr) {
          console.error("⚠️ Welcome email error:", emailErr);
        }
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
