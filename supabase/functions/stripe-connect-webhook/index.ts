import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2025-02-24.acacia',
    httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature');

    if (!signature) {
        return new Response('No signature', { status: 400 });
    }

    try {
        const body = await req.text();
        const endpointSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET');
        let event;

        if (endpointSecret) {
            try {
                event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
            } catch (err) {
                return new Response(`Webhook Error: ${err.message}`, { status: 400 });
            }
        } else {
            // Allow unverified for testing if explicit variable (risky in prod, but useful for dev)
            if (Deno.env.get('ALLOW_UNVERIFIED_WEBHOOK') === 'true') {
                event = JSON.parse(body);
            } else {
                return new Response('Webhook Secret missing', { status: 500 });
            }
        }

        // Handle the event
        if (event.type === 'account.updated') {
            const account = event.data.object;

            // Check if charges_enabled is true
            // Update partner in DB
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );

            const { error } = await supabaseAdmin
                .from('partners')
                .update({
                    stripe_charges_enabled: account.charges_enabled,
                    // We could also sync other info like country, currency, etc.
                })
                .eq('stripe_account_id', account.id);

            if (error) {
                console.error('Error updating partner:', error);
                return new Response('Error updating partner', { status: 500 });
            }

            console.log(`Updated partner ${account.id} status to ${account.charges_enabled}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err) {
        console.error(`Error processing webhook: ${err.message}`);
        return new Response(`Server Error: ${err.message}`, { status: 400 });
    }
});
