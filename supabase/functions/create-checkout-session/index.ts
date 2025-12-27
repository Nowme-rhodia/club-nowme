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
        const { offer_id, price, user_id, success_url, cancel_url, booking_type } = await req.json()

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
        const { data: offer, error: offerError } = await supabaseClient
            .from('offers')
            .select('title, image_url, description')
            .eq('id', offer_id)
            .single()

        if (offerError || !offer) {
            throw new Error("Offer not found")
        }

        // 2. Create Stripe Checkout Session
        // We pass metadata to track the booking details on success
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: offer.title,
                            description: offer.description ? offer.description.substring(0, 100) + '...' : undefined,
                            images: offer.image_url ? [offer.image_url] : [],
                        },
                        unit_amount: Math.round(price * 100), // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}&offer_id=${offer_id}&type=${booking_type}&amount=${price}&status=success`,
            cancel_url: cancel_url,
            client_reference_id: user_id,
            metadata: {
                offer_id: offer_id,
                user_id: user_id,
                booking_type: booking_type,
                source: 'club-nowme'
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
