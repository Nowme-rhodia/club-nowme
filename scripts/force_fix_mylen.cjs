
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
    console.error('Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
// const stripe = new Stripe(stripeSecretKey); // Not needed for force fix if we know what to do

const TARGET_EMAIL = 'mylen.nicolas@gmail.com';

async function forceFix() {
    console.log(`🔍 Debugging user: ${TARGET_EMAIL}`);

    // 1. Get Initial State
    const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', TARGET_EMAIL)
        .single();

    if (profileError) {
        console.error('❌ User not found:', profileError);
        return;
    }

    console.log(`   Initial State -> Status: ${userProfile.subscription_status}, StripeID: ${userProfile.stripe_customer_id}`);

    // 2. FORCE Update (Explicit hardcoded values for verification)
    const updates = {
        subscription_status: 'active',
        // subscription_tier: 'premium', // Trying without this to ensure no schema issues
        subscription_updated_at: new Date().toISOString()
    };

    // We need to re-fetch Stripe ID if it's missing, but let's assume the previous script found it.
    // If not, I'll fetch it again quickly.
    const stripe = new Stripe(stripeSecretKey);
    const customers = await stripe.customers.list({ email: TARGET_EMAIL, limit: 1 });
    if (customers.data.length > 0) {
        updates.stripe_customer_id = customers.data[0].id;

        const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'active', limit: 1 });
        if (subs.data.length > 0) {
            updates.stripe_subscription_id = subs.data[0].id;
            updates.subscription_type = subs.data[0].items.data[0].price.unit_amount === 39900 ? 'yearly' : 'monthly';
        }
    } else {
        console.error("❌ Stripe customer not found during re-check!");
        return;
    }

    console.log(`   Applying Updates:`, updates);

    const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userProfile.user_id);

    if (updateError) {
        console.error('❌ Update Error:', updateError);
    } else {
        console.log('✅ Update Success command sent.');
    }

    // 3. COMPLETE RE-FETCH to verify persistence
    const { data: verifiedProfile, error: verifyError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userProfile.user_id)
        .single();

    if (verifyError) {
        console.error('❌ Verify Read Error:', verifyError);
    } else {
        console.log(`   FINAL State -> Status: ${verifiedProfile.subscription_status}, StripeID: ${verifiedProfile.stripe_customer_id}`);
        if (verifiedProfile.subscription_status !== 'active') {
            console.error("🚨 CRITICAL: Persistence Failed! Status reverted to:", verifiedProfile.subscription_status);
        } else {
            console.log("✨ Persistence Configured.");
        }
    }
}

forceFix();
