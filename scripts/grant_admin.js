import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Required environment variables (URL or SERVICE_ROLE_KEY) are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const targetEmail = 'rhodia.kw@gmail.com';

async function grantAdmin() {
    console.log(`--- Granting Admin Access to ${targetEmail} ---`);

    // 1. Get User ID
    const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', targetEmail)
        .single();

    if (userError || !userData) {
        console.error('❌ Error finding user:', userError);
        return;
    }

    const userId = userData.user_id;
    console.log(`✅ Found User ID: ${userId}`);

    // 2. Update user_profiles -- ONLY is_admin is a real column
    // role and subscription_status are derived in the frontend/backend logic, not stored on this table.
    const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
            is_admin: true
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('❌ Error updating profile:', updateError);
    } else {
        console.log('✅ User profile updated: is_admin = true');
    }

    // 3. Update or Insert Subscription (Just in case)
    // We check if a subscription record exists
    const { data: subData } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (subData) {
        const { error: subUpdateError } = await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // +1 year
            })
            .eq('user_id', userId);

        if (subUpdateError) console.error('❌ Error updating subscription:', subUpdateError);
        else console.log('✅ Subscription table updated to active.');
    } else {
        // Insert new dummy subscription
        const { error: subInsertError } = await supabase
            .from('subscriptions')
            .insert({
                user_id: userId,
                status: 'active',
                stripe_subscription_id: 'sub_admin_manual_override',
                current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            });

        if (subInsertError) console.error('❌ Error inserting subscription:', subInsertError);
        else console.log('✅ New active subscription record created.');
    }
}

grantAdmin();
