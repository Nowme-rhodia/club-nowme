import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.10.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    let step = "init";

    const { application_id } = await req.json();

    if (!application_id) {
      throw new Error("Missing application_id");
    }

    // 1. Get Application Details
    step = "fetch_application";
    const { data: application, error: appError } = await supabase
      .from("ambassador_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      throw new Error(`Application not found: ${appError?.message}`);
    }

    const userId = application.user_id;

    // Let's get email from profiles table directly to be safe
    step = "fetch_profile";
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("email, first_name")
      .eq("user_id", userId)
      .single();

    if (profileError) throw new Error("Profile not found");
    const userEmail = profile.email;

    // 2. Update Application Status
    step = "update_application";
    const { error: updateAppError } = await supabase
      .from("ambassador_applications")
      .update({ status: "approved" })
      .eq("id", application_id);

    if (updateAppError) throw updateAppError;

    // 3. Update User Profile (is_ambassador = true)
    step = "update_profile_status";
    const { error: updateProfileError } = await supabase
      .from("user_profiles")
      .update({
        is_ambassador: true,
        ambassador_start_date: new Date().toISOString(),
        ambassador_last_reminder_at: null
      })
      .eq("user_id", userId);

    if (updateProfileError) throw updateProfileError;

    // 4. Stripe Logic: Apply 12.99€ rate (Discount from 39.99€)
    step = "stripe_coupon";
    const couponId = "AMBASSADOR_RATE_27_OFF";
    try {
      await stripe.coupons.retrieve(couponId);
    } catch (err) {
      // Create if doesn't exist
      await stripe.coupons.create({
        id: couponId,
        amount_off: 2700, // 27.00 EUR
        currency: 'eur',
        duration: 'repeating',
        duration_in_months: 6,
        name: 'Ambassador Rate (12.99€/mo)',
      });
    }

    // Find Customer
    step = "stripe_customer";
    let customerId = null;

    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    let stripeMessage = "No active subscription found to discount.";

    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        // Apply Coupon
        await stripe.subscriptions.update(subscription.id, {
          coupon: couponId,
        });
        stripeMessage = `Ambassador rate applied to subscription ${subscription.id}`;
      }
    }

    // 5. [NEW] Send Notification Email
    if (userEmail) {
      step = "send_email";
      const userName = profile.first_name || "Ambassadrice";
      const emailContent = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #E25563;">Félicitations, tu es Ambassadrice ! 🎉</h1>
                <p>Hello ${userName},</p>
                <p>Nous avons une excellente nouvelle : ta candidature pour rejoindre le programme Ambassadrice Nowme a été <strong>validée</strong> ! 💖</p>
                
                <p>Ton mandat commence officiellement aujourd'hui ! 🚀</p>
                <p>Profite à fond de tes avantages pendant les 6 prochains mois. Nous ferons un point ensemble à l'issue de cette période (ou quand tu le souhaites) pour revisiter tes motivations.</p>

                <h3>Ce qui change pour toi :</h3>
                <ul>
                    <li>✨ Ton abonnement passe automatiquement au tarif préférentiel de <strong>12,99€/mois</strong> (au lieu de 39,99€).</li>
                    <li>🚀 Tu as accès aux missions et avantages réservés aux ambassadrices.</li>
                    <li>👑 Ton profil affiche désormais le badge Ambassadrice.</li>
                </ul>

                <p style="margin-top: 20px;">
                    <a href="https://club.nowme.fr/ambassador/dashboard" style="background-color: #E25563; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accéder à mon espace</a>
                </p>

                <p style="margin-top: 30px; font-size: 12px; color: #888;">Si tu as des questions, réponds simplement à cet email.</p>
                <p>À très vite,<br>L'équipe Nowme</p>
            </div>
        `;

      try {
        await resend.emails.send({
          from: "Nowme <contact@nowme.fr>",
          to: [userEmail],
          subject: "✨ Ta candidature Ambassadrice est validée !",
          html: emailContent,
        });
      } catch (emailError: any) {
        console.error("Failed to send welcome email:", emailError);
        // Log but don't fail, user status is updated.
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Ambassador approved successfully",
        stripe_status: stripeMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack,
        step: error.step || 'unknown'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 to ensure client receives the body
      }
    );
  }
});
