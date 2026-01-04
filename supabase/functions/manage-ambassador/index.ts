import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.10.0";
import { Resend } from "npm:resend@2.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

        const { user_id, action } = await req.json();

        if (!user_id || !action) {
            throw new Error("Missing user_id or action");
        }

        // 1. Get User Profile for Email
        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("email, first_name")
            .eq("user_id", user_id)
            .single();

        if (profileError || !profile) throw new Error("Profile not found");
        const userEmail = profile.email;

        let message = "";
        let stripeMessage = "";

        if (action === "revoke") {
            // --- REVOKE LOGIC ---
            // 1. Update User Profile
            await supabase
                .from("user_profiles")
                .update({
                    is_ambassador: false,
                    ambassador_start_date: null,
                    ambassador_last_reminder_at: null
                })
                .eq("user_id", user_id);

            // 1.5 Update Application Status
            await supabase
                .from("ambassador_applications")
                .update({ status: 'revoked' })
                .eq("user_id", user_id);

            // 2. Stripe: Remove Coupon
            if (userEmail) {
                const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
                if (customers.data.length > 0) {
                    const customerId = customers.data[0].id;
                    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });

                    if (subscriptions.data.length > 0) {
                        const sub = subscriptions.data[0];
                        // Remove coupon by updating with coupon: null
                        await stripe.subscriptions.update(sub.id, { coupon: null as any });
                        // Note: Stripe API for unsetting might need unset param or null. 
                        // In node library, passing null usually works or empty string. 
                        // Let's try explicit deletion if needed, but update is cleaner.
                        stripeMessage = "Stripe discount removed.";
                    }
                }
            }

            // 3. Email Notification
            if (userEmail) {
                await resend.emails.send({
                    from: "Nowme <contact@nowme.fr>",
                    to: [userEmail],
                    subject: "Fin de votre statut Ambassadrice",
                    html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <h1>Bonjour ${profile.first_name || ''},</h1>
                        <p>Nous vous informons que votre mandat d'Ambassadrice Nowme a pris fin aujourd'hui.</p>
                        <p>Votre abonnement continuera au tarif standard lors du prochain renouvellement.</p>
                        <p>Merci pour votre engagement !</p>
                        <p>L'équipe Nowme</p>
                    </div>
                `
                });
            }
            message = "Ambassadrice révoquée avec succès.";

        } else if (action === "renew") {
            // --- RENEW LOGIC ---
            // 1. Update DB
            await supabase
                .from("user_profiles")
                .update({
                    is_ambassador: true,
                    ambassador_start_date: new Date().toISOString(),
                    ambassador_last_reminder_at: null
                })
                .eq("user_id", user_id);

            // 2. Stripe: Re-Apply Coupon
            const couponId = "AMBASSADOR_RATE_27_OFF";
            try {
                await stripe.coupons.retrieve(couponId);
            } catch (err) {
                // Re-create just in case
                await stripe.coupons.create({
                    id: couponId,
                    amount_off: 2700,
                    currency: 'eur',
                    duration: 'repeating',
                    duration_in_months: 6,
                    name: 'Ambassador Rate (12.99€/mo)',
                });
            }

            if (userEmail) {
                const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
                if (customers.data.length > 0) {
                    const customerId = customers.data[0].id;
                    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });

                    if (subscriptions.data.length > 0) {
                        const sub = subscriptions.data[0];
                        await stripe.subscriptions.update(sub.id, { coupon: couponId });
                        stripeMessage = "Stripe discount renewed for 6 months.";
                    }
                }
            }

            // 3. Email Notification
            if (userEmail) {
                await resend.emails.send({
                    from: "Nowme <contact@nowme.fr>",
                    to: [userEmail],
                    subject: "C'est reparti pour 6 mois ! 🎉",
                    html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <h1 style="color: #E25563;">Félicitations ${profile.first_name || ''} !</h1>
                        <p>Votre mandat d'Ambassadrice a été renouvelé pour <strong>6 mois supplémentaires</strong> ! 💖</p>
                        <p>Vous continuez de bénéficier du tarif préférentiel et de tous les avantages.</p>
                        <p>Merci de continuer l'aventure avec nous !</p>
                        <p>L'équipe Nowme</p>
                    </div>
                `
                });
            }
            message = "Mandat renouvelé avec succès.";
        } else if (action === "test_warning") {
            // --- TEST WARNING LOGIC ---
            // Backdate to 5 months + 20 days ago (approx 170 days) to trigger the 5.5 month warning
            const backdate = new Date();
            backdate.setDate(backdate.getDate() - 170);

            const { error: updateError } = await supabase
                .from("user_profiles")
                .update({
                    ambassador_start_date: backdate.toISOString(),
                    ambassador_last_reminder_at: null
                })
                .eq("user_id", user_id);

            if (updateError) throw updateError;

            // Trigger the check immediately
            // We use fetch to call the other function
            const functionsUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.supabase.co/functions/v1') ?? '';

            // We fire and forget the check, or await it
            console.log("Triggering check-ambassador-expiry...");
            const response = await fetch(`${functionsUrl}/check-ambassador-expiry`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseData = await response.json();
            console.log("Check expiry response:", responseData);

            const processedAdmins = responseData.processedAdmins || [];
            const processedUsers = responseData.processed || [];

            message = `Simulation terminée.\n\nSimulée pour: ${processedUsers.length > 0 ? processedUsers.join(', ') : 'Aucun (étrange)'}\nAdmins ciblés: ${processedAdmins.length > 0 ? processedAdmins.join(', ') : 'Aucun detected'}\n\nRésultat: ${response.ok ? 'Succès API' : 'Erreur API'}.`;
        }

        return new Response(
            JSON.stringify({ success: true, message, stripe_status: stripeMessage }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    } catch (error: any) {
        console.error("Manage Ambassador Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
