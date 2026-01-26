
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

const TARGET_EMAILS = [
    'bimakijanaw97@gmail.com',
    'aboneetest@gmail.com',
    'hasnafoutouh@outlook.fr', // Included for verification
    'mylen.nicolas@gmail.com'
];

async function checkAndFixUsers() {
    console.log(`🔍 Starting batch verification for ${TARGET_EMAILS.length} users...`);
    console.log('---------------------------------------------------');

    for (const email of TARGET_EMAILS) {
        console.log(`\n📧 Checking: ${email}`);

        // 1. Find User in Supabase
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (profileError || !userProfile) {
            console.error(`❌ User not found in Supabase: ${profileError?.message || 'No data'}`);
            continue;
        }

        console.log(`   Supabase ID: ${userProfile.user_id}`);
        console.log(`   DB Status: ${userProfile.subscription_status || 'NULL'}`);
        console.log(`   DB Stripe ID: ${userProfile.stripe_customer_id || 'NULL'}`);

        // 2. Find Customer in Stripe
        const customers = await stripe.customers.list({
            email: email,
            limit: 1
        });

        if (customers.data.length === 0) {
            console.error(`❌ No Stripe Customer found for this email.`);
            continue;
        }

        const customer = customers.data[0];
        console.log(`   ✅ Stripe Customer: ${customer.id}`);

        // 3. Find Subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 5 // Fetch a few to be safe
        });

        let activeSub = subscriptions.data.find(sub => sub.status === 'active' || sub.status === 'trialing');

        if (!activeSub) {
            console.log(`   ⚠️ No ACTIVE subscription found in Stripe. (Found ${subscriptions.data.length} others)`);
            if (subscriptions.data.length > 0) {
                console.log(`      Latest status: ${subscriptions.data[0].status}`);
            }
        } else {
            console.log(`   ✅ Found ACTIVE Subscription: ${activeSub.id} (${activeSub.status})`);

            // 4. Update Supabase if needed
            const updates = {};
            let needsUpdate = false;

            if (userProfile.subscription_status !== 'active') {
                updates.subscription_status = 'active';
                updates.subscription_tier = 'premium';
                needsUpdate = true;
            }

            if (userProfile.stripe_customer_id !== customer.id) {
                updates.stripe_customer_id = customer.id;
                needsUpdate = true;
            }

            if (userProfile.stripe_subscription_id !== activeSub.id) {
                updates.stripe_subscription_id = activeSub.id;
                updates.subscription_type = activeSub.items?.data[0]?.price?.unit_amount === 39900 ? 'yearly' : 'monthly';
                updates.subscription_updated_at = new Date().toISOString();
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log(`   💾 Applying updates:`, updates);
                const { error: updateError } = await supabase
                    .from('user_profiles')
                    .update(updates)
                    .eq('user_id', userProfile.user_id);

                if (updateError) {
                    console.error(`   ❌ Update failed:`, updateError);
                } else {
                    console.log(`   ✅ Profile successfully updated!`);
                }
            } else {
                console.log(`   ✨ Profile is already up to date.`);
            }
        }
    }
    console.log('\n---------------------------------------------------');
    console.log('✅ Batch check completed.');
}

checkAndFixUsers();
