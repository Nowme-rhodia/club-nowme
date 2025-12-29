import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

console.log("Stripe Webhook Function Invoked")

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')

    if (!signature) {
        return new Response('No signature', { status: 400 })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
        apiVersion: '2022-11-15',
        httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Must use Service Role for webhook admin actions
    )

    try {
        const body = await req.text()
        const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

        let event;

        if (endpointSecret) {
            try {
                event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
            } catch (err) {
                console.error(`Webhook signature verification failed.`, err.message)
                return new Response(`Webhook Error: ${err.message}`, { status: 400 })
            }
        } else {
            // Fallback for local testing without signature verification if needed, 
            // but highly recommended to use the secret even locally via CLI forwarding
            const json = JSON.parse(body)
            event = json;
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const metadata = session.metadata

            if (metadata && metadata.source === 'club-nowme') {
                console.log('Processing Club Nowme Booking:', session.id, 'Metadata:', metadata)

                const { user_id, offer_id, booking_type, variant_id } = metadata
                const amount = session.amount_total ? session.amount_total / 100 : 0

                // Decode variant_id from string metadata
                const parsedVariantId = (variant_id && variant_id !== 'null' && variant_id !== 'undefined') ? variant_id : null;
                console.log('Confirming Booking with Variant ID:', parsedVariantId);

                // Atomically confirm booking and decrement stock
                const { data, error } = await supabaseClient.rpc('confirm_booking', {
                    p_user_id: user_id,
                    p_offer_id: offer_id,
                    p_booking_date: new Date().toISOString(),
                    p_status: 'confirmed',
                    p_source: 'stripe',
                    p_amount: amount,
                    p_variant_id: parsedVariantId,
                    p_external_id: session.id
                })

                if (error) {
                    console.error('Failed to confirm booking:', error)
                    // Note: In a real prod scenario, you might want to trigger a refund or alert admin here
                    // if stock ran out between checkout start and finish (rare but possible)
                    return new Response('Booking Confirmation Failed', { status: 500 })
                }

                console.log('Booking confirmed successfully:', data)
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (err) {
        console.error(err)
        return new Response(`Server Error: ${err.message}`, { status: 400 })
    }
})