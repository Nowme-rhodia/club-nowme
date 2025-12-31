
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;
// Needs Service Role to update partners table usually, or at least a powerful user. 
// If specific service role key is not in .env, this might fail on RLS if using anon.
// But partner updating their own row might be allowed?
// Actually, let's hope SUPABASE_SERVICE_ROLE_KEY is in .env or we use a workaround.

const stripeSecretKey = envConfig.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.error("❌ MISSING STRIPE_SECRET_KEY in .env file. Cannot sync with Stripe.");
    process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16', // Use a recent version
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPartner() {
    console.log("🔄 Syncing Stripe Status for 'Nowme'...");

    // 1. Get Partner row
    const { data: partners, error } = await supabase
        .from('partners')
        .select('id, business_name, stripe_account_id')
        .eq('business_name', 'Nowme');

    if (error || !partners || partners.length === 0) {
        console.error("❌ Partner 'Nowme' not found in DB.");
        return;
    }

    const partner = partners[0];
    const accountId = partner.stripe_account_id;

    if (!accountId) {
        console.log("❌ No Stripe Account ID found for partner.");
        return;
    }

    console.log(`Checking Stripe Account: ${accountId}`);

    try {
        const account = await stripe.accounts.retrieve(accountId);
        const chargesEnabled = account.charges_enabled;
        const payoutsEnabled = account.payouts_enabled;
        const detailsSubmitted = account.details_submitted;

        console.log(`   - Charges Enabled: ${chargesEnabled}`);
        console.log(`   - Payouts Enabled: ${payoutsEnabled}`);
        console.log(`   - Details Submitted: ${detailsSubmitted}`);

        // Update DB
        if (chargesEnabled) {
            const { error: updateError } = await supabase
                .from('partners')
                .update({ stripe_charges_enabled: true })
                .eq('id', partner.id);

            if (updateError) {
                console.error("❌ Failed to update DB:", updateError);
            } else {
                console.log("✅ Database updated: stripe_charges_enabled = true");
            }
        } else {
            console.log("⚠️ Account is not fully enabled yet on Stripe side.");
        }

    } catch (err) {
        console.error("❌ Error contacting Stripe:", err.message);
    }
}

syncPartner();
