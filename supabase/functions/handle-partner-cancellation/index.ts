import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.10.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML Templates (Simple versions)
const getCustomerEmailHtml = (booking: any, reason: string) => `
  <div style="font-family: sans-serif; color: #333;">
    <h1>Annulation de votre séance</h1>
    <p>Bonjour ${booking.user?.first_name || 'Client'},</p>
    <p>Nous sommes désolés de vous informer que votre séance <strong>${booking.offers?.title}</strong> prévue le <strong>${new Date(booking.date).toLocaleDateString("fr-FR")}</strong> a été annulée par le professionnel.</p>
    <p><strong>Motif indiqué :</strong> ${reason}</p>
    <p>Un remboursement intégral a été initié auprès de votre banque et devrait apparaître sous 5 à 10 jours ouvrés.</p>
    <p>Nous vous invitons à découvrir d'autres offres similaires sur le Club Nowme.</p>
    <p>À bientôt,<br>L'équipe Nowme</p>
  </div>
`;

const getPartnerEmailHtml = (booking: any, penalty: number, reason: string) => `
  <div style="font-family: sans-serif; color: #333;">
    <h1>Confirmation d'annulation</h1>
    <p>Bonjour,</p>
    <p>Vous avez annulé la séance <strong>${booking.offers?.title}</strong> du <strong>${new Date(booking.date).toLocaleDateString("fr-FR")}</strong>.</p>
    <p><strong>Motif :</strong> ${reason}</p>
    <hr>
    <h3>Récapitulatif financier</h3>
    <p>Conformément aux CGP, les frais suivants ont été appliqués :</p>
    <ul>
      <li>Frais de gestion et transaction engagés : <strong>${penalty.toFixed(2)}€</strong></li>
    </ul>
    <p>Ce montant a été ajouté à vos "Pénalités en attente" et sera régularisé ultérieurement.</p>
    <p>L'équipe Nowme</p>
  </div>
`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        // 1. Get User
        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            throw new Error("Unauthorized");
        }

        const { booking_id, reason } = await req.json();

        if (!booking_id || !reason) {
            throw new Error("Missing booking_id or reason");
        }

        // 2. Fetch Booking & Validate Ownership
        const { data: booking, error: bookingError } = await supabaseClient
            .from("bookings")
            .select(`
        *,
        offers!inner (
          title,
          partner_id
        ),
        user:user_profiles (
            first_name,
            last_name,
            email
        ),
        payment_intent_id,
        amount
      `)
            .eq("id", booking_id)
            .single();

        if (bookingError || !booking) {
            throw new Error("Booking not found");
        }

        const bookingData = booking as any;
        const bookingPartnerId = bookingData.offers?.partner_id;

        // Check if the current user is the partner via user_profiles
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('user_profiles')
            .select('partner_id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !userProfile?.partner_id) {
            throw new Error("Unauthorized: You do not have a partner profile.");
        }

        if (userProfile.partner_id !== bookingPartnerId) {
            throw new Error("Unauthorized: You are not the partner for this booking.");
        }

        if (bookingData.status === "cancelled") {
            throw new Error("Booking is already cancelled.");
        }

        // 3. Process Stripe Refund & Calculate Fees
        let stripeFeePennies = 0;
        const managementFeePennies = 500; // 5.00 EUR fixed

        if (bookingData.payment_intent_id) {
            // Retrieve PaymentIntent to get the Charge
            const paymentIntent = await stripe.paymentIntents.retrieve(bookingData.payment_intent_id, {
                expand: ['latest_charge.balance_transaction']
            });

            const charge = paymentIntent.latest_charge as any;
            const balanceTx = charge?.balance_transaction;

            if (balanceTx && balanceTx.fee) {
                stripeFeePennies = balanceTx.fee; // Stripe fee in cents
            }

            // Execute Refund
            await stripe.refunds.create({
                payment_intent: bookingData.payment_intent_id,
                reason: 'requested_by_customer', // Using generic reason to avoid risk flags, recorded internally in metadata
                metadata: {
                    cancelled_by_partner: 'true',
                    partner_id: bookingPartnerId,
                    reason: reason
                }
            });
        }

        const totalPenaltyData = (stripeFeePennies + managementFeePennies) / 100; // Convert to currency unit (EUR)

        // 4. Update Database

        // Update Booking
        const { error: updateBookingError } = await supabaseClient
            .from("bookings")
            .update({
                status: "cancelled",
                cancelled_by_partner: true,
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason,
            })
            .eq("id", booking_id);

        if (updateBookingError) throw updateBookingError;

        // Update Partner Penalty
        const { data: partnerData, error: partnerFetchError } = await supabaseClient
            .from('partners')
            .select('pending_penalties')
            .eq('id', bookingPartnerId)
            .single();

        if (partnerFetchError) throw partnerFetchError;

        const currentPenalties = Number(partnerData.pending_penalties || 0);
        const newPenalties = currentPenalties + totalPenaltyData;

        const { error: updatePartnerError } = await supabaseClient
            .from('partners')
            .update({ pending_penalties: newPenalties })
            .eq('id', bookingPartnerId);

        if (updatePartnerError) throw updatePartnerError;

        // 5. Trigger Notifications (Insert to 'emails' table)

        const emailsToInsert = [];

        // Client Email
        if (bookingData.user?.email) {
            emailsToInsert.push({
                to_address: bookingData.user.email,
                subject: "Annulation de votre séance - Club Nowme",
                content: getCustomerEmailHtml(bookingData, reason),
                status: 'pending'
            });
        }

        // Partner Email (Recap)
        const { data: partnerUser } = await supabaseClient
            .from('user_profiles')
            .select('email')
            .eq('id', user.id)
            .single();

        if (partnerUser?.email) {
            emailsToInsert.push({
                to_address: partnerUser.email,
                subject: "Confirmation d'annulation de séance",
                content: getPartnerEmailHtml(bookingData, totalPenaltyData, reason),
                status: 'pending'
            });
        }

        if (emailsToInsert.length > 0) {
            const { error: emailError } = await supabaseClient
                .from('emails')
                .insert(emailsToInsert);

            if (!emailError) {
                // 6. Trigger 'send-emails' function to process queue immediately
                await supabaseClient.functions.invoke('send-emails');
            } else {
                console.error("Failed to queue emails:", emailError);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                penalty_applied: totalPenaltyData
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
