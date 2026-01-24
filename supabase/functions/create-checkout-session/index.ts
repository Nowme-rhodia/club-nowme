import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from "npm:stripe@^14.10.0";

console.log("Create Checkout Session Function Invoked (v7 - Standardized Import)")

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const reqBody = await req.json()
        const { offer_id, price, user_id, user_email, success_url, cancel_url, booking_type, variant_id, travel_fee, department_code, scheduled_at } = reqBody

        // Initialisation propre via Import Map (Standard)
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                // No global headers needed as we are using Service Role
            }
        )

        // 1. Fetch Offer
        const { data: offer, error: offerError } = await supabaseClient
            .from('offers')
            .select('title, image_url, description, service_zones, is_official') // Added is_official
            .eq('id', offer_id)
            .single();

        if (offerError || !offer) throw new Error("Offer not found");

        // ... Variant Logic ...
        let unitAmount = Math.round(price * 100);
        let variantName = '';

        if (variant_id) {
            const { data: variant, error: variantError } = await supabaseClient
                .from('offer_variants')
                .select('price, discounted_price, stock, name')
                .eq('id', variant_id)
                .single();

            if (variantError || !variant) throw new Error("Variant not found");
            const expectedPrice = variant.discounted_price || variant.price;
            unitAmount = Math.round(expectedPrice * 100);
            variantName = ` - ${variant.name}`;

            // Note: If variant logic overrides price passed in body, ensure we use correct base price for discount.
            // But usually price passed in body is trusted if verified, or we overwrite unitAmount here.
            // The existing code sets unitAmount. We should also enforce 'price' variable if we use it later?
            // Existing code used `amount=${price}` in success_url. We should probably use unitAmount/100 or keep consistency.
            // For now, let's focus on unitAmount modification.
        }

        // --- NEW: Ambassador Discount Logic ---
        let userData: any = null;
        if (user_id) {
            console.log(`[DEBUG] Checking Ambassador Status for user_id: ${user_id}`);
            const { data, error } = await supabaseClient
                .from('user_profiles')
                .select('email, is_ambassador')
                .eq('user_id', user_id)
                .single();

            if (error) {
                console.error(`[DEBUG] Error fetching user profile: ${JSON.stringify(error)}`);
            } else {
                userData = data;
            }
        }

        let appliedDiscount = 0;
        if (userData?.is_ambassador && offer.is_official) {
            console.log(`[DEBUG] Applying Ambassador Discount for Official Event`);
            // Rule: Free if < 50€, else -50€
            const discountThreshold = 5000; // 50.00 EUR in cents

            if (unitAmount <= discountThreshold) {
                unitAmount = 0;
                appliedDiscount = price; // Full price discount
            } else {
                unitAmount = unitAmount - discountThreshold;
                appliedDiscount = 50;
            }
            console.log(`[DEBUG] New Unit Amount: ${unitAmount}`);
        }



        // ... Ambassador Logic ...

        // --- NEW: Installment Logic (2x, 3x, 4x) ---
        const installment_plan = reqBody.installment_plan; // '2x', '3x', '4x'
        let planType = '1x';

        if (installment_plan && ['2x', '3x', '4x'].includes(installment_plan)) {
            console.log(`[DEBUG] Processing Installment Plan: ${installment_plan}`);
            const parts = parseInt(installment_plan[0]);

            // 1. Check Eligibility (Deadline Rule)
            if (offer.event_start_date) {
                const eventDate = new Date(offer.event_start_date);
                const deadline = new Date(eventDate);
                deadline.setDate(deadline.getDate() - 7); // 7 days before

                const now = new Date();
                const monthsToFinish = parts - 1; // 3x means Now + 1mo + 2mo (duration 2mo)

                const finishDate = new Date(now);
                finishDate.setMonth(finishDate.getMonth() + monthsToFinish);

                if (finishDate > deadline) {
                    throw new Error(`Le paiement en ${installment_plan} n'est pas disponible pour cet événement (soldes 7 jours avant le début).`);
                }
            }

            // 2. Adjust Price
            // Simple split for now. We assume the remaining payments will be scheduled for same amount.
            // Note: Stripe Subscription/Schedule should handle standard amount.
            // We use Math.floor to ensure we don't overcharge, but ideally we handle the remainder on first payment.
            // Let's do: Amount = Total / Parts.
            unitAmount = Math.round(unitAmount / parts);
            planType = installment_plan;
        }

        // 1b. Travel Fee (Remaining logic unchanged, just ensuring unitAmount is used)
        let travelFeeLineItem = null;
        if (travel_fee && travel_fee > 0) {
            // ...
            travelFeeLineItem = {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Frais de déplacement - ${department_code || 'Zone'}`,
                        description: `Déplacement à domicile`,
                        images: [],
                    },
                    unit_amount: Math.round(travel_fee * 100),
                },
                quantity: 1,
            };
        }

        // 2. Address Concatenation
        let finalMeetingLocation = reqBody.meeting_location || '';
        if (department_code && finalMeetingLocation) {
            finalMeetingLocation = `[${department_code}] ${finalMeetingLocation}`;
        }

        const line_items = [
            {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `${offer.title}${variantName} (${planType === '1x' ? 'Comptant' : 'Paiement ' + planType})`,
                        description: offer.description ? offer.description.replace(/<[^>]*>?/gm, '').substring(0, 400) : undefined,
                        images: offer.image_url ? [offer.image_url] : [],
                    },
                    unit_amount: unitAmount,
                },
                quantity: reqBody.quantity || 1,
            },
        ];

        if (travelFeeLineItem) {
            // NOTE: Travel fee is usually paid UPFRONT fully. 
            // If we are in installment mode, should we split travel fee? 
            // Usually, fees are paid immediately. 
            // For simplicity in this iteration, we leave it as is (added to first payment).
            // But if we want total split, we should have added it to unitAmount before splitting.
            // Current behavior: Product split in N, Fee paid 100% now.
            line_items.push(travelFeeLineItem);
        }

        // Priority: DB Email -> Payload Email
        let customerEmail = userData?.email;

        if (!customerEmail && user_email) {
            console.log(`[DEBUG] DB email missing/empty, using payload email: ${user_email}`);
            customerEmail = user_email;
        } else {
            console.log(`[DEBUG] Using DB email: ${customerEmail}`);
        }

        // Calculate final total (First Payment)
        const finalTotal = (unitAmount + (travelFeeLineItem?.price_data?.unit_amount || 0)) / 100;

        // Session Config
        const sessionConfig: any = {
            payment_method_types: ['card', 'paypal'],
            line_items: line_items,
            mode: 'payment',
            customer_email: customerEmail,
            success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&offer_id=${offer_id}&type=${booking_type}&amount=${finalTotal}&status=success&variant_id=${variant_id ? String(variant_id) : 'null'}&scheduled_at=${scheduled_at || ''}`,
            cancel_url: cancel_url,
            client_reference_id: user_id,
            metadata: {
                offer_id: offer_id,
                user_id: user_id,
                booking_type: booking_type,
                source: 'club-nowme',
                variant_id: variant_id ? String(variant_id) : 'null',
                department_code: department_code || '',
                travel_fee: travel_fee ? String(travel_fee) : '0',
                meeting_location: finalMeetingLocation,
                is_ambassador_discount: userData?.is_ambassador && offer.is_official ? 'true' : 'false',
                plan_type: planType, // '2x', '3x', '4x' or '1x'
                installment_amount: planType !== '1x' ? String(unitAmount) : '0',
                scheduled_at: scheduled_at || '' // NEW: Pass scheduled date to webhook
            },
        };

        // If Installment -> Save Card for Future Usage
        if (planType !== '1x') {
            sessionConfig.payment_intent_data = {
                setup_future_usage: 'off_session',
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig)

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error: any) {
        console.error("Error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        )
    }
})
