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
        if (!stripeKey) {
            console.error('MISSING STRIPE_SECRET_KEY');
            throw new Error('Configuration error: STRIPE_SECRET_KEY is missing in Edge Function Secrets.');
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2025-02-24.acacia',
            httpClient: Stripe.createFetchHttpClient(),
        });

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // Initialize Admin Client for DB operations (bypassing RLS)
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceRoleKey) throw new Error('MISSING SUPABASE_SERVICE_ROLE_KEY');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            serviceRoleKey
        );

        // 1. Get Partner ID (User Profile)
        // We can safely search by user_id since we verified the user above
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('partner_id')
            .eq('user_id', user.id)
            .single();

        if (!profile?.partner_id) {
            throw new Error('User is not a linked to a partner account');
        }

        // 2. Get Partner Details
        const { data: partner, error: partnerError } = await supabaseAdmin
            .from('partners')
            .select('stripe_account_id, business_name, contact_email')
            .eq('id', profile.partner_id)
            .single();

        if (partnerError || !partner) {
            console.error('Error fetching partner:', partnerError);
            throw new Error('Partner not found found in database');
        }

        let accountId = partner.stripe_account_id;

        // 3. Create Stripe Account if not exists
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'FR', // Default to FR for now
                email: partner.contact_email || user.email,
                capabilities: {
                    transfers: { requested: true },
                },
                business_type: 'company',
                company: {
                    name: partner.business_name,
                }
            });

            accountId = account.id;

            // Save to DB
            await supabaseAdmin
                .from('partners')
                .update({ stripe_account_id: accountId })
                .eq('id', profile.partner_id);
        }

        // 4. Create Account Link
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${req.headers.get('origin')}/partner/dashboard/financials?refresh=true`,
            return_url: `${req.headers.get('origin')}/partner/dashboard/financials?success=true`,
            type: 'account_onboarding',
        });

        return new Response(
            JSON.stringify({ url: accountLink.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Edge Function Error:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
