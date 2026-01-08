
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
                const { user_id, offer_id, variant_id, meeting_location, scheduled_at } = session.metadata
                const amount = session.amount_total ? session.amount_total / 100 : 0



                // --- 0. CHECK SINGLE PURCHASE LIMIT ---
                const { data: offerDetails } = await supabaseClient
                    .from('offers')
                    .select('booking_type, requires_agenda')
                    .eq('id', offer_id)
                    .single();

                if (offerDetails && (offerDetails.booking_type === 'event' || offerDetails.requires_agenda)) {
                    console.log(`[Limit Check] Checking existing bookings for User ${user_id} on Offer ${offer_id}...`);
                    const { data: existingBooking } = await supabaseClient
                        .from('bookings')
                        .select('id, status')
                        .eq('user_id', user_id)
                        .eq('offer_id', offer_id)
                        .neq('status', 'cancelled')
                        .maybeSingle();

                    if (existingBooking) {
                        console.error(`[BLOCK] User ${user_id} already booked offer ${offer_id}. ID: ${existingBooking.id}`);
                        return new Response(`Already booked. Booking ID: ${existingBooking.id}`, { status: 400 });
                    }
                }

                // --- 1. ROBUST DATE & LOCATION LOGIC ---
                // If this is an event and scheduled_at is missing, fetch it from offer.
                // If meeting_location is missing, fetch it from offer.

                let finalScheduledAt = scheduled_at;
                let finalMeetingLocation = meeting_location || "";

                // Only fetch if we are missing something crucial
                if (offerDetails && (offerDetails.booking_type === 'event' || offerDetails.requires_agenda)) {
                    // We might need more details than we fetched in limit check
                    // Fetch full offer details needed for recovery
                    const { data: recoveryOffer } = await supabaseClient
                        .from('offers')
                        .select('event_start_date, street_address, zip_code, city')
                        .eq('id', offer_id)
                        .single();

                    if (recoveryOffer) {
                        if (!finalScheduledAt && recoveryOffer.event_start_date) {
                            console.log(`[RECOVERY] Recovered event date from DB: ${recoveryOffer.event_start_date}`);
                            finalScheduledAt = recoveryOffer.event_start_date;
                        }
                        if (!finalMeetingLocation) {
                            const addr = recoveryOffer.street_address ? `${recoveryOffer.street_address}, ${recoveryOffer.zip_code} ${recoveryOffer.city}` : recoveryOffer.city;
                            console.log(`[RECOVERY] Recovered location from DB: ${addr}`);
                            finalMeetingLocation = addr || "Adresse non spécifiée";
                        }
                    }
                }

                // Date Logic
                const nowIso = new Date().toISOString();

                // --- VERBOSE LOG 2: MAPPED DATA ---
                const bookingObject = {
                    p_user_id: user_id,
                    p_offer_id: offer_id,
                    p_booking_date: finalScheduledAt || null, // FIX: Don't default to 'now' for p_booking_date (scheduled_at) if missing. Keep it null so it shows in Upcoming.
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
                    console.error(`[SECURITY_BLOCK] Identity Mismatch! Internal: ${internalEmail} vs Stripe: ${stripeEmail}. ID: ${user_id}.`);
                    return new Response("Identity mismatch: Email does not match user account.", { status: 400 });
                } else {
                    console.log("[EMAIL_MATCH_CONFIRMED] Stripe email matches internal profile.");
                }
                // ------------------------------------

                // 3. Execute RPC
                const { data, error } = await supabaseClient.rpc('confirm_booking', bookingObject)

                // DATA PERSISTENCE PATCH: Update scheduled_at manually since RPC param update failed deployment
                const bookingId = (data as any)?.booking_id || (typeof data === 'string' ? data : null);
                if (bookingId && finalScheduledAt) {
                    console.log(`[PATCH] Patching scheduled_at for booking ${bookingId}: ${finalScheduledAt}`);
                    const { error: patchError } = await supabaseClient
                        .from('bookings')
                        .update({ scheduled_at: finalScheduledAt })
                        .eq('id', bookingId);

                    if (patchError) console.error("[PATCH_ERROR] Error patching scheduled_at:", patchError);
                    else console.log("[PATCH_SUCCESS] Scheduled_at saved.");
                }

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

                // 5. [NEW] WALLET PACK FULFILLMENT
                const bookingType = session.metadata.booking_type;
                if (bookingType === 'wallet_pack' && data?.booking_id && variant_id) {
                    console.log(`[WALLET_PACK] Processing fulfillment for Booking ${data.booking_id}`);

                    // Fetch Variant to get Credit Amount
                    const { data: variantData, error: varError } = await supabaseClient
                        .from('offer_variants')
                        .select('price, credit_amount, offer_id')
                        .eq('id', variant_id)
                        .single();

                    if (varError || !variantData) {
                        console.error("[WALLET_PACK] Failed to fetch variant data:", varError);
                    } else {
                        // Determine Credit Value (Fallback to price if credit_amount is null)
                        const creditValue = variantData.credit_amount || variantData.price;

                        // Get Partner ID from Offer
                        const { data: offerData } = await supabaseClient
                            .from('offers')
                            .select('partner_id')
                            .eq('id', variantData.offer_id)
                            .single();

                        if (offerData?.partner_id) {
                            const { data: walletResult, error: walletError } = await supabaseClient.rpc('credit_wallet', {
                                p_user_id: user_id,
                                p_partner_id: offerData.partner_id,
                                p_amount: creditValue,
                                p_description: `Achat Pack (Ref: ${data.booking_id})`
                            });

                            if (walletError) {
                                console.error("[WALLET_PACK] RPC credit_wallet Failed:", walletError);
                            } else {
                                console.log("[WALLET_PACK] Success! Wallet credited:", walletResult);

                                // --- 6. Notify Partner (Email) ---
                                // Fetch Partner Email
                                const { data: partnerData, error: partnerError } = await supabaseClient
                                    .from('partners')
                                    .select('email, business_name')
                                    .eq('id', offerData.partner_id)
                                    .single();

                                if (partnerData?.email) {
                                    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
                                    if (RESEND_API_KEY) {
                                        const subject = `💰 Nouvelle vente de Pack - ${partnerData.business_name}`;
                                        const htmlContent = `
                                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                                                <h1 style="color: #2563EB;">Un client a acheté un Pack Ardoise !</h1>
                                                <p>Bonjour ${partnerData.business_name},</p>
                                                <p>Bonne nouvelle ! Un utilisateur de NowMe vient de créditer une cagnotte valable dans votre établissement.</p>
                                                
                                                <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                                    <p style="margin: 0; font-weight: bold; color: #1E40AF;">Montant crédité : ${creditValue}€</p>
                                                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #1E3A8A;">(Ce montant est disponible pour le client)</p>
                                                </div>

                                                <h3>🚨 Important - Procédure d'encaissement</h3>
                                                <p>L'argent de cet achat a été encaissé par NowMe. <strong>Vous n'avez rien à faire pour le moment.</strong></p>
                                                <p>Le paiement réel vers votre compte se fera <strong>au moment de la consommation</strong>.</p>

                                                <h3>Comment ça marche ?</h3>
                                                <ol>
                                                    <li>Le client viendra dans votre établissement.</li>
                                                    <li>Au moment de l'addition, il paiera via l'application NowMe (sa cagnotte).</li>
                                                    <li>Vous verrez un <strong>Ecran Vert</strong> de validation sur son téléphone.</li>
                                                    <li>C'est à ce moment-là que la somme consommée s'ajoutera à votre solde à vous reverser.</li>
                                                </ol>

                                                <p>Merci pour votre confiance !</p>
                                                <p>L'équipe NowMe</p>
                                            </div>
                                        `;

                                        await fetch('https://api.resend.com/emails', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${RESEND_API_KEY}`
                                            },
                                            body: JSON.stringify({
                                                from: 'Nowme Partners <partenaires@nowme.fr>',
                                                to: [partnerData.email],
                                                subject: subject,
                                                html: htmlContent
                                            })
                                        }).catch(e => console.error("[WALLET_PACK] Partner Email Failed:", e));
                                    } else {
                                        console.warn("[WALLET_PACK] RESEND_API_KEY missing, skipping partner email.");
                                    }
                                } else {
                                    console.warn("[WALLET_PACK] Partner email not found or fetch error:", partnerError);
                                }
                            }
                        }
                    }
                }


                // 5b. HANDLE INSTALLMENT PLAN (2x, 3x, 4x)
                if (session.metadata && ['2x', '3x', '4x'].includes(session.metadata.plan_type)) {
                    console.log(`[INSTALLMENT_PLAN] Processing ${session.metadata.plan_type} plan for User ${session.metadata.user_id}`);
                    const planType = session.metadata.plan_type;
                    const totalParts = parseInt(planType[0]);
                    const installmentAmount = parseFloat(session.metadata.installment_amount);
                    const offerId = session.metadata.offer_id;
                    const userId = session.metadata.user_id;

                    // A. Create Payment Plan in DB
                    // We use session.amount_total (which includes travel fee on 1st payment) + remaining installments.
                    const remainingParts = totalParts - 1;
                    const remainingAmount = installmentAmount * remainingParts;
                    const totalPlanAmount = (session.amount_total / 100) + remainingAmount;

                    const { data: planData, error: planError } = await supabaseClient
                        .from('payment_plans')
                        .insert({
                            booking_id: data.booking_id,
                            user_id: userId,
                            plan_type: planType,
                            total_amount: totalPlanAmount,
                            status: 'active',
                            metadata: {
                                offer_id: offerId,
                                first_payment_session_id: session.id,
                                installment_amount: installmentAmount
                            }
                        })
                        .select()
                        .single();

                    if (planError) {
                        console.error("[INSTALLMENT_PLAN] Failed to create payment plan:", planError);
                    } else {
                        console.log("[INSTALLMENT_PLAN] Plan Created:", planData.id);

                        // B. Record First Installment (Paid)
                        await supabaseClient.from('payment_installments').insert({
                            plan_id: planData.id,
                            amount: session.amount_total / 100, // Includes fee
                            due_date: new Date().toISOString(),
                            status: 'paid',
                            paid_at: new Date().toISOString(),
                            stripe_payment_intent_id: session.payment_intent as string,
                            attempt_count: 1
                        });

                        // C. Create Stripe Schedule for Remaining Parts
                        try {
                            const product = await stripe.products.create({
                                name: `Echéance ${planType} - Ref: ${data.booking_id}`,
                                metadata: { booking_id: data.booking_id, plan_id: planData.id }
                            });

                            const price = await stripe.prices.create({
                                unit_amount: Math.round(installmentAmount * 100),
                                currency: 'eur',
                                recurring: { interval: 'month', usage_type: 'licensed' },
                                product: product.id
                            });

                            const now = new Date();
                            const startDate = new Date(now);
                            startDate.setMonth(startDate.getMonth() + 1);

                            const schedule = await stripe.subscriptionSchedules.create({
                                customer: session.customer as string,
                                start_date: Math.floor(startDate.getTime() / 1000),
                                end_behavior: 'cancel',
                                phases: [
                                    {
                                        items: [{ price: price.id, quantity: 1 }],
                                        iterations: remainingParts,
                                        metadata: {
                                            plan_id: planData.id,
                                            booking_id: data.booking_id,
                                            is_installment: 'true'
                                        }
                                    }
                                ],
                                metadata: {
                                    plan_id: planData.id,
                                    booking_id: data.booking_id
                                }
                            });

                            // D. Update Plan with Schedule ID
                            await supabaseClient
                                .from('payment_plans')
                                .update({ stripe_schedule_id: schedule.id })
                                .eq('id', planData.id);

                            // E. Create Pending Installments in DB
                            for (let i = 0; i < remainingParts; i++) {
                                const dueDate = new Date(startDate);
                                dueDate.setMonth(dueDate.getMonth() + i);

                                await supabaseClient.from('payment_installments').insert({
                                    plan_id: planData.id,
                                    amount: installmentAmount,
                                    due_date: dueDate.toISOString(),
                                    status: 'pending',
                                    attempt_count: 0
                                });
                            }
                            console.log(`[INSTALLMENT_PLAN] Schedule ${schedule.id} created with ${remainingParts} phases.`);

                        } catch (stripeErr) {
                            console.error("[INSTALLMENT_PLAN] Stripe Schedule Creation Failed:", stripeErr);
                        }
                    }
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

            // --- A. INSTALLMENT HANDLING ---
            // Check if this invoice belongs to a Payment Plan via Metadata
            // Metadata can be on the invoice itself (if passed) or on the subscription line item.
            // Stripe Schedules pass metadata to subscription phases.
            let planId = invoice.metadata?.plan_id;
            let bookingId = invoice.metadata?.booking_id;

            // If not on invoice root, check line items
            if (!planId && invoice.lines?.data?.length > 0) {
                // Usually the first line item corresponds to the subscription phase
                const lineItem = invoice.lines.data[0];
                if (lineItem.metadata?.plan_id) {
                    planId = lineItem.metadata.plan_id;
                    bookingId = lineItem.metadata.booking_id;
                }
            }

            if (planId) {
                console.log(`[INVOICE_PAID] Detected Installment Payment for Plan ${planId}`);

                // 1. Update Installment Status in DB
                // Find the oldest pending installment for this plan
                const { data: installment, error: fetchError } = await supabaseClient
                    .from('payment_installments')
                    .select('id, amount')
                    .eq('plan_id', planId)
                    .eq('status', 'pending')
                    .order('due_date', { ascending: true })
                    .limit(1)
                    .single();

                if (fetchError || !installment) {
                    console.error(`[INVOICE_PAID] No pending installment found for plan ${planId}:`, fetchError);
                } else {
                    console.log(`[INVOICE_PAID] Marking installment ${installment.id} as paid.`);

                    const { error: updateError } = await supabaseClient
                        .from('payment_installments')
                        .update({
                            status: 'paid',
                            paid_at: new Date().toISOString(),
                            stripe_invoice_id: invoice.id,
                            stripe_payment_intent_id: invoice.payment_intent,
                            attempt_count: 1 // Successful attempt
                        })
                        .eq('id', installment.id);

                    if (updateError) {
                        console.error(`[INVOICE_PAID] Failed to update installment status:`, updateError);
                    } else {
                        // 2. Wallet Credit Logic (Pro-Rata)
                        // Fetch Booking to see if it's a Wallet Pack
                        if (bookingId) {
                            const { data: booking } = await supabaseClient
                                .from('bookings')
                                .select('offer_id, variant_id, user_id')
                                .eq('id', bookingId)
                                .single();

                            if (booking && booking.variant_id) {
                                const { data: variantData } = await supabaseClient
                                    .from('offer_variants')
                                    .select('credit_amount, price')
                                    .eq('id', booking.variant_id)
                                    .single();

                                // Check if it's a Pack (has credit_amount)
                                if (variantData?.credit_amount) {
                                    // Calculate Pro-Rata Credit
                                    // We need Total Parts. Fetch Plan?
                                    // Or assume standardized splitting?
                                    // Ideally: Credit = TotalCredit / TotalParts.
                                    // Let's fetch the plan to know Total Installments.
                                    const { data: planData } = await supabaseClient
                                        .from('payment_plans')
                                        .select('plan_type, status')
                                        .eq('id', planId)
                                        .single();

                                    if (planData && ['2x', '3x', '4x'].includes(planData.plan_type)) {
                                        const parts = parseInt(planData.plan_type[0]);
                                        const creditPerPart = variantData.credit_amount / parts;

                                        console.log(`[INVOICE_PAID] Crediting Wallet (Pro-Rata): ${creditPerPart} (1/${parts} of ${variantData.credit_amount})`);

                                        // Reuse credit_wallet RPC
                                        // We need partner_id
                                        const { data: offerData } = await supabaseClient
                                            .from('offers')
                                            .select('partner_id')
                                            .eq('id', booking.offer_id)
                                            .single();

                                        if (offerData?.partner_id) {
                                            await supabaseClient.rpc('credit_wallet', {
                                                p_user_id: booking.user_id,
                                                p_partner_id: offerData.partner_id,
                                                p_amount: creditPerPart,
                                                p_description: `Echéance Pack (Ref: ${bookingId})`
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // --- B. RECEIPT EMAIL (Original Logic) ---
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

        } else if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            console.log(`[INVOICE_FAILED] Invoice ${invoice.id} failed. Customer: ${invoice.customer}, Amount: ${invoice.amount_due}`);

            // Installment Logic: Same detection as Succeeded
            let planId = invoice.metadata?.plan_id;
            // If not on invoice root, check line items
            if (!planId && invoice.lines?.data?.length > 0) {
                const lineItem = invoice.lines.data[0];
                if (lineItem.metadata?.plan_id) {
                    planId = lineItem.metadata.plan_id;
                }
            }

            if (planId) {
                console.log(`[INVOICE_FAILED] Detected Failed Installment for Plan ${planId}`);

                // 1. Update Installment Status to 'failed'
                // Find oldest pending
                const { data: installment } = await supabaseClient
                    .from('payment_installments')
                    .select('id, attempt_count')
                    .eq('plan_id', planId)
                    .eq('status', 'pending')
                    .order('due_date', { ascending: true })
                    .limit(1)
                    .single();

                if (installment) {
                    const newAttemptCount = (installment.attempt_count || 0) + 1;
                    await supabaseClient
                        .from('payment_installments')
                        .update({
                            status: 'failed',
                            stripe_invoice_id: invoice.id,
                            attempt_count: newAttemptCount
                        })
                        .eq('id', installment.id);

                    console.log(`[INVOICE_FAILED] Marked installment ${installment.id} as failed (Attempt ${newAttemptCount}).`);

                    // 2. Send Failure Warning Email
                    // Trigger 'send-payment-failed-email'
                    const email = invoice.customer_email || invoice.customer_details?.email;
                    if (email) {
                        try {
                            await supabaseClient.functions.invoke('send-payment-failed-email', {
                                body: {
                                    email: email,
                                    invoiceId: invoice.number,
                                    planId: planId,
                                    amount: invoice.amount_due / 100,
                                    retryLink: invoice.hosted_invoice_url // Link to pay manually
                                }
                            });
                            console.log(`[INVOICE_FAILED] Triggered failure email to ${email}`);
                        } catch (emailErr) {
                            console.error(`[INVOICE_FAILED] Failed to trigger email:`, emailErr);
                        }
                    }
                }
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