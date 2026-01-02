import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^14.10.0'

console.log("Create Checkout Session Function Invoked (v7 - Stable NPM Import)")

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
        const { offer_id, price, user_id, user_email, success_url, cancel_url, booking_type, variant_id, travel_fee, department_code } = reqBody

        // Initialisation propre sans adaptateur inutile qui fait crasher Deno
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // 1. Fetch Offer
        const { data: offer, error: offerError } = await supabaseClient
            .from('offers')
            .select('title, image_url, description, service_zones')
            .eq('id', offer_id)
            .single();

        if (offerError || !offer) throw new Error("Offer not found");

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
        }

        // 1b. Travel Fee
        let travelFeeLineItem = null;
        if (travel_fee && travel_fee > 0) {
            travelFeeLineItem = {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Frais de déplacement - ${department_code || 'Zone'}`,
                        description: `Déplacement à domicile`,
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
                        name: `${offer.title}${variantName}`,
                        description: offer.description ? offer.description.substring(0, 100) : undefined,
                        images: offer.image_url ? [offer.image_url] : [],
                    },
                    unit_amount: unitAmount,
                },
                quantity: 1,
            },
        ];

        if (travelFeeLineItem) line_items.push(travelFeeLineItem);

        // --- NEW: Strict Email Consistency (Robust V2) ---
        console.log(`[DEBUG] Fetching email for user_id: ${user_id}`);
        const { data: userData, error: userError } = await supabaseClient
            .from('user_profiles')
            .select('email')
            .eq('user_id', user_id)
            .single();

        if (userError) {
            console.error(`[DEBUG] Error fetching user profile: ${JSON.stringify(userError)}`);
        }

        // Priority: DB Email -> Payload Email
        let customerEmail = userData?.email;

        if (!customerEmail && user_email) {
            console.log(`[DEBUG] DB email missing/empty, using payload email: ${user_email}`);
            customerEmail = user_email;
        } else {
            console.log(`[DEBUG] Using DB email: ${customerEmail}`);
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'],
            line_items: line_items,
            mode: 'payment',
            customer_email: customerEmail, // FORCE EMAIL
            success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&offer_id=${offer_id}&type=${booking_type}&amount=${price + (travel_fee || 0)}&status=success&variant_id=${variant_id ? String(variant_id) : 'null'}`,
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
                meeting_location: finalMeetingLocation
            },
        })

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error) {
        console.error("Error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        )
    }
})
