import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Debugging Schema ---');

    // Check user_profiles
    const { data: userData, error: userError } = await supabase.from('user_profiles').select('id, email').limit(1);
    if (userError) console.error('Error selecting user_profiles:', userError);
    else console.log('user_profiles email check:', userData && userData.length > 0 ? 'OK' : 'Empty or OK');

    // Check marketing_campaign_logs
    // Note: RLS might block this if using anon key, but we are using service role key (hopefully) or we need to check usage
    const { data: logData, error: logError } = await supabase.from('marketing_campaign_logs').select('id, email').limit(1);
    if (logError) console.error('Error selecting marketing_campaign_logs:', logError);
    else console.log('marketing_campaign_logs email check:', logData ? 'OK' : 'Empty');

    // Check customer_orders columns
    const { data: orderData, error: orderError } = await supabase.from('customer_orders').select('*').limit(1);
    if (orderError) console.error('Error selecting customer_orders:', orderError);
    else if (orderData && orderData.length > 0) {
        console.log('customer_orders columns:', Object.keys(orderData[0]).join(', '));
    } else {
        console.log('customer_orders is empty');
    }

    console.log('\n--- Calling RPC ---');

    const { data, error } = await supabase.rpc('get_marketing_targets');

    if (error) {
        console.error('Error invoking get_marketing_targets:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No targets found for today.');
        return;
    }

    console.log(`Found ${data.length} targets:`);
    data.forEach(t => {
        console.log(`- [${t.campaign_type}] ${t.target_email} (${t.target_first_name})`);
        if (t.metadata && Object.keys(t.metadata).length > 0) {
            console.log(`  Metadata:`, JSON.stringify(t.metadata));
        }
    });
}

main();
