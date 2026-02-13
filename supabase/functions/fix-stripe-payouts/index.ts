import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeKey) throw new Error('MISSING STRIPE_SECRET_KEY');

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2024-06-20',
            httpClient: Stripe.createFetchHttpClient(),
        });

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Fetch all partners with a stripe_account_id
        const { data: partners, error } = await supabaseAdmin
            .from('partners')
            .select('id, business_name, stripe_account_id')
            .not('stripe_account_id', 'is', null);

        if (error) throw error;

        const results = [];

        for (const partner of partners) {
            try {
                if (!partner.stripe_account_id) continue;

                await stripe.accounts.update(partner.stripe_account_id, {
                    settings: {
                        payouts: {
                            schedule: {
                                interval: 'daily',
                            },
                        },
                    },
                });
                results.push({ id: partner.id, name: partner.business_name, status: 'updated' });
            } catch (err) {
                console.error(`Error updating partner ${partner.business_name}:`, err);
                results.push({ id: partner.id, name: partner.business_name, status: 'error', error: err.message });
            }
        }

        return new Response(
            JSON.stringify({ message: 'Payouts updated', results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
