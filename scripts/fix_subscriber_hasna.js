
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
const stripe = new Stripe(stripeSecretKey);

const TARGET_EMAIL = 'hasnafoutouh@outlook.fr';

async function fixSubscriber() {
    console.log(`🔍 Investigating user: ${TARGET_EMAIL}`);

    // 1. Find User in Supabase
    const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', TARGET_EMAIL)
        .single();

    if (profileError || !userProfile) {
        console.error('❌ User not found in database:', profileError);
        return;
    }

    console.log(`✅ Found User Profile: ${userProfile.user_id}`);
    console.log(`   Current Status: ${userProfile.subscription_status}`);
    console.log(`   Current Stripe ID: ${userProfile.stripe_customer_id}`);

    // 2. Find Customer in Stripe
    console.log(`🔍 Searching Stripe for customer...`);
    const customers = await stripe.customers.list({
        email: TARGET_EMAIL,
        limit: 1
    });

    if (customers.data.length === 0) {
        console.error('❌ No customer found in Stripe with this email.');
        return;
    }

    const customer = customers.data[0];
    console.log(`✅ Found Stripe Customer: ${customer.id}`);

    // 3. Find Subscriptions
    console.log(`🔍 Searching active subscriptions...`);
    const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1
    });

    if (subscriptions.data.length === 0) {
        console.warn('⚠️ No ACTIVE subscription found. Checking all statuses...');
        const allSubs = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 1
        });

        if (allSubs.data.length > 0) {
            console.log(`ℹ️ Found non-active subscription: ${allSubs.data[0].id} (Status: ${allSubs.data[0].status})`);
        } else {
            console.error('❌ No subscriptions found at all.');
            // Still update customer ID if missing
        }
    }

    const subscription = subscriptions.data[0];
    if (subscription) {
        console.log(`✅ Found Active Subscription: ${subscription.id}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Plan: ${subscription.items?.data[0]?.price?.nickname || 'Unknown'} (${subscription.items?.data[0]?.price?.unit_amount / 100}€)`);
    }

    // 4. Update Supabase
    const updates = {
        stripe_customer_id: customer.id
    };

    if (subscription && subscription.status === 'active') {
        updates.subscription_status = 'active';
        updates.stripe_subscription_id = subscription.id;
        updates.subscription_type = subscription.items?.data[0]?.price?.unit_amount === 39900 ? 'yearly' : 'monthly';
        updates.subscription_updated_at = new Date().toISOString();
        updates.subscription_tier = 'premium'; // Assuming premium for all subs for now based on context
    }

    console.log(`💾 Applying updates to Supabase:`, updates);

    const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userProfile.user_id);

    if (updateError) {
        console.error('❌ Error updating profile:', updateError);
    } else {
        console.log('✅ Profile successfully updated!');
    }
}

fixSubscriber();
