import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

console.log("Create Checkout Session Function Invoked")

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const reqBody = await req.json()
        console.log("DEBUG: create-checkout-session payload:", JSON.stringify(reqBody)); // [DEBUG] Log entire payload
        const { offer_id, price, user_id, success_url, cancel_url, booking_type, variant_id, travel_fee, department_code } = reqBody

        // Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        )

        // 1. Fetch Offer Details to confirm price and get title
        let offerQuery = supabaseClient
            .from('offers')
            .select('title, image_url, description, service_zones')
            .eq('id', offer_id)
            .single();

        const { data: offer, error: offerError } = await offerQuery;

        if (offerError || !offer) {
            throw new Error("Offer not found")
        }

        // 1a. Verify Variant if provided
        let unitAmount = Math.round(price * 100);
        let variantName = '';

        if (variant_id) {
            const { data: variant, error: variantError } = await supabaseClient
                .from('offer_variants')
                .select('price, discounted_price, stock, name')
                .eq('id', variant_id)
                .single();

            if (variantError || !variant) throw new Error("Variant not found");

            if (variant.stock !== null && variant.stock <= 0) {
                throw new Error("Ce tarif est épuisé (Out of Stock)");
            }

            const expectedPrice = variant.discounted_price || variant.price;
            // Allow small float tolerance if needed, but strict check is better for security
            if (Math.abs(expectedPrice - price) > 0.01) {
                throw new Error("Price mismatch detected");
            }

            unitAmount = Math.round(expectedPrice * 100);
            variantName = ` - ${variant.name}`;
        }

        // 1b. Verify Travel Fee if provided
        let travelFeeLineItem = null;
        if (travel_fee && travel_fee > 0) {
            if (!offer.service_zones || !Array.isArray(offer.service_zones)) {
                throw new Error("This offer does not support service zones.");
            }
            if (!department_code) {
                throw new Error("Department code required for travel fee.");
            }

            const zone = offer.service_zones.find((z: any) => z.code === department_code);
            if (!zone) {
                throw new Error(`Department ${department_code} is not served by this offer.`);
            }

            // Verify fee matches (or is close enough to handle float issues)
            // Ideally exact match.
            if (Math.abs(zone.fee - travel_fee) > 0.01) {
                throw new Error("Travel fee mismatch.");
            }

            travelFeeLineItem = {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Frais de déplacement - ${department_code}`,
                        description: `Déplacement à domicile`,
                    },
                    unit_amount: Math.round(travel_fee * 100),
                },
                quantity: 1,
            };
        }

        // 2. Create Stripe Checkout Session
        // We pass metadata to track the booking details on success
        const safeVariantId = variant_id ? String(variant_id) : 'null';
        console.log("Creating Session with Variant ID:", safeVariantId);

        const line_items = [
            {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `${offer.title}${variantName}`,
                        description: offer.description ? offer.description.substring(0, 100) + '...' : undefined,
                        images: offer.image_url ? [offer.image_url] : [],
                    },
                    unit_amount: unitAmount,
                },
                quantity: 1,
            },
        ];

        if (travelFeeLineItem) {
            line_items.push(travelFeeLineItem);
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'],
            line_items: line_items,
            mode: 'payment',
            success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&offer_id=${offer_id}&type=${booking_type}&amount=${price + (travel_fee || 0)}&status=success&variant_id=${safeVariantId}`,
            cancel_url: cancel_url,
            client_reference_id: user_id,
            metadata: {
                offer_id: offer_id,
                user_id: user_id,
                booking_type: booking_type,
                source: 'club-nowme',
                // Stripe metadata values must be strings and max 500 chars
                // We convert null to empty string or rely on client sending valid UUID
                variant_id: safeVariantId,
                department_code: department_code || '',
                travel_fee: travel_fee ? String(travel_fee) : '0',
                meeting_location: reqBody.meeting_location || '' // Add meeting_location to metadata
            },
        })

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error) {
        console.error("Error creating checkout session:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        )
    }
})
