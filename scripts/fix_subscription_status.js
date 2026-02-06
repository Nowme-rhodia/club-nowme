
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSubscriptionStatus() {
    console.log('🔍 Starting subscription status repair...');

    // 1. Get all users who should have a subscription (active or payment_pending in profiles)
    const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, subscription_status, stripe_subscription_id, subscription_updated_at')
        .in('subscription_status', ['active', 'payment_pending', 'trialing'])
        .not('stripe_subscription_id', 'is', null);

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log(`FOUND: ${profiles.length} users with active/pending status in profile.`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
        // 2. Check if they exist in the subscriptions table
        const { data: subscription, error: subCheckError } = await supabase
            .from('subscriptions')
            .select('id, status')
            .eq('user_id', profile.user_id)
            .maybeSingle();

        if (subCheckError) {
            console.error(`Error checking subscription for ${profile.user_id}:`, subCheckError);
            errorCount++;
            continue;
        }

        if (!subscription) {
            console.log(`⚠️  MISSING SUBSCRIPTION for User ${profile.user_id} (Status: ${profile.subscription_status})`);

            // 3. Insert missing subscription record
            // We set a default period end of 30 days from now if we can't get it easily, 
            // or we could try to fetch from Stripe if we had the SDK initialized, 
            // but for now let's just ensure the record exists so they get access.
            const defaultPeriodEnd = new Date();
            defaultPeriodEnd.setDate(defaultPeriodEnd.getDate() + 30);

            const { data: insertedData, error: insertError } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: profile.user_id,
                    status: profile.subscription_status,
                    stripe_subscription_id: profile.stripe_subscription_id,
                    current_period_end: defaultPeriodEnd.toISOString(),
                    cancel_at_period_end: false,
                    created_at: profile.subscription_updated_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select(); // Create return data

            if (insertError) {
                // If error is PGRST204, it might just be a false negative (No content returned)
                // Let's verify if the record actually exists now.
                const { data: verifyData } = await supabase
                    .from('subscriptions')
                    .select('id')
                    .eq('user_id', profile.user_id)
                    .maybeSingle();

                if (verifyData) {
                    console.log(`✅ FIXED (Verified): Subscription record exists for ${profile.user_id} (ignored error: ${insertError.code})`);
                    fixedCount++;
                } else {
                    console.error(`❌ Failed to upsert subscription for ${profile.user_id}:`, JSON.stringify(insertError, null, 2));
                    errorCount++;
                }
            } else {
                console.log(`✅ FIXED: Upserted subscription record for ${profile.user_id}`);
                fixedCount++;
            }
        } else {
            // Optional: Check if status matches. 
            if (subscription.status !== profile.subscription_status) {
                console.log(`🔄 UPDATING status for ${profile.user_id} from ${subscription.status} to ${profile.subscription_status}`);
                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update({ status: profile.subscription_status })
                    .eq('user_id', profile.user_id);

                if (updateError) {
                    console.error(`❌ Failed to update status for ${profile.user_id}:`, updateError);
                    errorCount++;
                } else {
                    console.log(`✅ UPDATED: Status synchronized for ${profile.user_id}`);
                    fixedCount++;
                }
            } else {
                // console.log(`OK: User ${profile.user_id} already has correct subscription record.`);
                skippedCount++;
            }
        }
    }

    console.log('\n--- SUMMARY ---');
    console.log(`Processed: ${profiles.length}`);
    console.log(`Fixed/Updated: ${fixedCount}`);
    console.log(`Skipped (Already OK): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
}

fixSubscriptionStatus().catch(console.error);
