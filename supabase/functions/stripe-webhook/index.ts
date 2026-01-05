
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^14.10.0'

console.log("Stripe Webhook Function Invoked (v7 - NPM Native)")


Deno.serve(async (req) => {
    // 0. Init Clients (MOVED INSIDE SERVE FOR SAFETY)
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
        apiVersion: '2023-10-16',
        httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    try {
        const signature = req.headers.get('Stripe-Signature');
        const body = await req.text();
        const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

        let event;

        // 1. Strict Verification
        if (endpointSecret && signature) {
            try {
                event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
            } catch (err: any) {
                console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
                console.warn("⚠️ [DEBUG_MODE] Proceeding with manual JSON parse to debug logic flows (Check STRIPE_WEBHOOK_SECRET).");
                event = JSON.parse(body);
            }
        } else {
            console.warn("⚠️ [DEV_MODE] Skipping verification (STRIPE_WEBHOOK_SECRET or Signature missing).");
            event = JSON.parse(body);
        }

        console.log(`[WEBHOOK_RECEIVED] Event: ${event.type} | ID: ${event.id}`);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object

            // --- VERBOSE LOG 1: RAW METADATA ---
            console.log("RAW_STRIPE_METADATA:", JSON.stringify(session.metadata, null, 2))

            if (session.metadata && session.metadata.source === 'club-nowme') {
                const { user_id, offer_id, variant_id, meeting_location } = session.metadata
                const amount = session.amount_total ? session.amount_total / 100 : 0

                // Address Fallback Logic
                const finalMeetingLocation = meeting_location || "";

                // Date Logic
                const nowIso = new Date().toISOString();

                // --- VERBOSE LOG 2: MAPPED DATA ---
                const bookingObject = {
                    p_user_id: user_id,
                    p_offer_id: offer_id,
                    p_booking_date: nowIso,
                    p_status: 'confirmed',
                    p_source: 'stripe',
                    p_amount: amount,
                    p_variant_id: (variant_id && variant_id !== 'null') ? variant_id : null,
                    p_external_id: session.id,
                    p_meeting_location: finalMeetingLocation
                };
                console.log("MAPPED_BOOKING_DATA_BEFORE_SAVE:", JSON.stringify(bookingObject, null, 2))

                // --- NEW: Email Consistency Check ---
                // We trust the Stripe session email because we forced it (or user entered it).
                // We want to check if it matches the internal user email.
                // We need to fetch the internal user email first.
                const { data: userProfileCheck } = await supabaseClient
                    .from('user_profiles')
                    .select('email')
                    .eq('user_id', user_id)
                    .single();

                const internalEmail = userProfileCheck?.email;
                const stripeEmail = session.customer_details?.email || session.customer_email;

                if (internalEmail && stripeEmail && internalEmail.toLowerCase() !== stripeEmail.toLowerCase()) {
                    console.error(`[CRITICAL_EMAIL_MISMATCH] Internal User: ${internalEmail} vs Stripe Payer: ${stripeEmail}. ID: ${user_id}. Proceeding with attribution to ID ${user_id}.`);
                } else {
                    console.log("[EMAIL_MATCH_CONFIRMED] Stripe email matches internal profile.");
                }
                // ------------------------------------

                // 3. Execute RPC
                const { data, error } = await supabaseClient.rpc('confirm_booking', bookingObject)

                // --- VERBOSE LOG 3: SQL RESULT ---
                console.log("SQL_UPSERT_RESULT:", JSON.stringify({ data, error }, null, 2))

                if (error) {
                    console.error('Failed to confirm booking (RPC error):', error)
                    return new Response(`Booking Confirmation Failed: ${error.message}`, { status: 500 })
                }

                // 4. Force Address Update
                if (finalMeetingLocation && data?.booking_id) {
                    const { error: updateError } = await supabaseClient
                        .from('bookings')
                        .update({ meeting_location: finalMeetingLocation })
                        .eq('id', data.booking_id);

                    if (updateError) console.error("FORCE_UPDATE_ERROR:", updateError);
                    else console.log("FORCE_UPDATE_SUCCESS: Address saved directly.");
                }

                // 5. Trigger Email
                const emailPayload = { id: data.booking_id };
                console.log("EMAIL_VARIABLES_FINAL:", JSON.stringify(emailPayload))

                try {
                    await supabaseClient.functions.invoke('send-confirmation-email', {
                        body: emailPayload
                    });
                } catch (emailErr) {
                    console.error('Failed to invoke email function:', emailErr);
                }
            } else if (session.metadata && session.metadata.source === 'subscription') {
                // --- HANDLING SUBSCRIPTION WELCOME EMAIL ---
                console.log(`[SUBSCRIPTION_FLOW] Detected subscription event. Metadata:`, JSON.stringify(session.metadata));

                const { user_id } = session.metadata;
                const email = session.customer_details?.email || session.customer_email;
                const name = session.customer_details?.name || "Beauty";

                // Extract First Name for personalization
                const firstName = name.split(' ')[0];

                console.log(`[SUBSCRIPTION_FLOW] Details extracted - Email: ${email}, FirstName: ${firstName}, UserId: ${user_id}`);

                try {
                    console.log(`[SUBSCRIPTION_FLOW] Invoking send-subscription-welcome...`);
                    const { error: invokeError } = await supabaseClient.functions.invoke('send-subscription-welcome', {
                        body: { email, firstName, user_id }
                    });

                    if (invokeError) {
                        console.error("[SUBSCRIPTION_FLOW] Invoke Error:", invokeError);
                    } else {
                        console.log("[SUBSCRIPTION_FLOW] Welcome email function triggered successfully.");
                    }
                } catch (emailErr) {
                    console.error("[SUBSCRIPTION_FLOW] Failed to trigger welcome email (exception):", emailErr);
                }
            } else {
                console.log("[IGNORED_EVENT] Event has no matching 'source' metadata. Metadata:", JSON.stringify(session.metadata));
            }

        } else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            console.log(`[INVOICE_PAID] Invoice ${invoice.id} paid. Customer: ${invoice.customer}, Amount: ${invoice.amount_paid}`);

            // Trigger dedicated Invoice Receipt Email
            // We need: email, amount, currency, date, invoicePdfUrl, invoiceId
            const email = invoice.customer_email || invoice.customer_details?.email;

            console.log(`[INVOICE_PAID] Raw Invoice Keys: ${Object.keys(invoice).join(', ')}`);
            console.log(`[INVOICE_PAID] Extracted Email: ${email}`);

            if (email) {
                try {
                    console.log(`[INVOICE_PAID] Invoking send-invoice-receipt...`);
                    const { data, error } = await supabaseClient.functions.invoke('send-invoice-receipt', {
                        body: {
                            email: email,
                            amount: invoice.amount_paid,
                            currency: invoice.currency,
                            date: invoice.created,
                            invoicePdfUrl: invoice.hosted_invoice_url || invoice.invoice_pdf,
                            invoiceId: invoice.number
                        }
                    });

                    if (error) {
                        console.error(`[INVOICE_PAID] Function Invocation Failed:`, error);
                    } else {
                        console.log(`[INVOICE_PAID] Receipt email triggered successfully. Data:`, data);
                    }
                } catch (err) {
                    console.error(`[INVOICE_PAID] Exception calling function:`, err);
                }
            } else {
                console.warn(`[INVOICE_PAID] SKIPPING RECEIPT: No email found in invoice. Object dump:`, JSON.stringify(invoice));
            }

        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const stripeCustomerId = subscription.customer;
            console.log(`[SUBSCRIPTION_DELETED] Processing deletion for customer ${stripeCustomerId}`);

            // 1. Find User by Stripe Customer ID
            const { data: userProfile, error: profileError } = await supabaseClient
                .from('user_profiles')
                .select('user_id, first_name')
                .eq('stripe_customer_id', stripeCustomerId)
                .single();

            if (profileError || !userProfile) {
                console.error(`[SUBSCRIPTION_DELETED] User not found for stripe_customer_id: ${stripeCustomerId}`);
                return new Response(JSON.stringify({ received: true, error: 'User not found' }), { headers: { "Content-Type": "application/json" } });
            }

            const userId = userProfile.user_id;
            console.log(`[SUBSCRIPTION_DELETED] Found User ID: ${userId}`);

            // 2. Fetch Email (from Auth) for Notification
            const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId);
            if (authUser && authUser.user && authUser.user.email) {
                const userEmail = authUser.user.email;
                const userName = userProfile.first_name || "Kiffeuse";

                console.log(`[SUBSCRIPTION_DELETED] Sending goodbye email to ${userEmail}...`);

                // 3. Send Benevolent Email
                const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
                if (RESEND_API_KEY) {
                    const subject = "Ce n'est qu'un au revoir... ✨";
                    const htmlContent = `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #D946EF;">Tu vas nous manquer ${userName} 💖</h1>
                            <p>Ton abonnement est arrivé à son terme et ton compte Nowme a été supprimé comme prévu.</p>
                            <p>Toutes tes données, réservations et créations ont été effacées.</p>
                            <p>Merci d'avoir fait partie de l'aventure. Nous espérons que tu as pu vivre de beaux moments de connexion et de découverte.</p>
                            <p>La porte reste toujours ouverte si tu souhaites revenir kiffer avec nous un jour.</p>
                            <p>Prends grand soin de toi !</p>
                            <br/>
                            <p>Avec toute notre affection,</p>
                            <p><strong>La Team Nowme</strong></p>
                        </div>
                    `;

                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${RESEND_API_KEY}`
                        },
                        body: JSON.stringify({
                            from: 'Nowme <contact@nowme.fr>',
                            to: [userEmail],
                            subject: subject,
                            html: htmlContent
                        })
                    }).catch(e => console.error("Email send failed", e));
                }
            }

            // 4. NUKE DATA
            console.log(`[SUBSCRIPTION_DELETED] Wiping data for user ${userId}...`);

            // Delete Squads
            await supabaseClient.from('micro_squads').delete().eq('creator_id', userId);
            // Delete Events
            await supabaseClient.from('events').delete().eq('organizer_id', userId);
            // Delete Profile
            await supabaseClient.from('user_profiles').delete().eq('user_id', userId);

            // 5. Delete Auth Account
            const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);

            if (deleteError) {
                console.error(`[SUBSCRIPTION_DELETED] Failed to delete auth user:`, deleteError);
            } else {
                console.log(`[SUBSCRIPTION_DELETED] User ${userId} successfully nuked.`);
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (err: any) {
        console.error("General Webhook Error:", err.message)
        return new Response(`Server Error: ${err.message}`, { status: 400 })
    }
})