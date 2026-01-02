import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// [FIX] Use a newer, stable Stripe version for Deno to avoid 'runMicrotasks' and Crypto errors
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno&no-check'

console.log("Stripe Webhook Function Invoked (v3 - CONFIRMED UPDATE)")

serve(async (req) => {
    // [FIX] Read the raw body ONCE as text to use suitable for both signature verification and JSON parsing
    const body = await req.text()
    const signature = req.headers.get('Stripe-Signature')

    if (!signature) {
        return new Response('No signature', { status: 400 })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
        apiVersion: '2023-10-16', // Updated API version
        httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    try {
        const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

        let event;

        if (endpointSecret) {
            try {
                // [FIX] constructEventAsync is safer for Deno environments
                event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret)
            } catch (err) {
                console.error(`Webhook signature verification failed: ${err.message}`)
                return new Response(`Webhook Error: ${err.message}`, { status: 400 })
            }
        } else {
            console.warn("WARNING: No STRIPE_WEBHOOK_SECRET set. Skipping verification (DEV ONLY).")
            event = JSON.parse(body)
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const metadata = session.metadata

            console.log('--- PROCESSING CHECKOUT SESSION ---');
            console.log('Session ID:', session.id);
            // Log fewer details to avoid circular log crashes, but show metadata
            console.log('Metadata:', JSON.stringify(metadata, null, 2));

            if (metadata && metadata.source === 'club-nowme') {
                const { user_id, offer_id, booking_type, variant_id, meeting_location } = metadata
                const amount = session.amount_total ? session.amount_total / 100 : 0

                const safeMeetingLocation = meeting_location || null;
                const parsedVariantId = (variant_id && variant_id !== 'null' && variant_id !== 'undefined') ? variant_id : null;

                console.log('Using Meeting Location:', safeMeetingLocation);

                // 1. Call RPC to confirm booking (Stock decrement, Status update)
                // We pass meeting_location here, but we DON'T trust it to stick if the RPC is stale.
                const { data, error } = await supabaseClient.rpc('confirm_booking', {
                    p_user_id: user_id,
                    p_offer_id: offer_id,
                    p_booking_date: new Date().toISOString(),
                    p_status: 'confirmed',
                    p_source: 'stripe',
                    p_amount: amount,
                    p_variant_id: parsedVariantId,
                    p_external_id: session.id,
                    p_meeting_location: safeMeetingLocation
                })

                if (error) {
                    console.error('Failed to confirm booking (RPC error):', error)
                    // We continue? No, usually stock decrement is critical.
                    // But maybe the RPC failed because of the "column does not exist" error?
                    // If so, we should try to fallback to a manual/simpler update?
                    // For now, return error, but user can retry.
                    return new Response(`Booking Confirmation Failed: ${error.message}`, { status: 500 })
                }

                console.log('RPC Success. Booking ID:', data.booking_id);

                // 2. [FAILSAFE] Force Update Address directly
                // This bypasses any stale logic in the RPC function.
                if (safeMeetingLocation && data.booking_id) {
                    console.log('Force-updating address via Client...');
                    const { error: updateError } = await supabaseClient
                        .from('bookings')
                        .update({ meeting_location: safeMeetingLocation })
                        .eq('id', data.booking_id);

                    if (updateError) {
                        console.error('Failed to force-update address:', updateError);
                    } else {
                        console.log('Address force-updated successfully.');
                    }
                }

                // 3. Trigger Confirmation Email
                // Use a proper background fetch or just invoke without awaiting the full response
                try {
                    console.log('Invoking send-confirmation-email...');
                    supabaseClient.functions.invoke('send-confirmation-email', {
                        body: { id: data.booking_id }
                    });
                    // Don't wait strictly
                } catch (emailErr) {
                    console.error('Failed to invoke email function:', emailErr);
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (err) {
        console.error("General Webhook Error:", err.message)
        return new Response(`Server Error: ${err.message}`, { status: 400 })
    }
})