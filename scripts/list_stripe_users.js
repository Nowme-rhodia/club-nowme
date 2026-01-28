import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// If unavailable, we might need SERVICE_KEY if RLS prevents reading sensitive data with ANON
// But let's try ANON first as partners table might be readable.

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listStripeUsers() {
    console.log('🔍 Searching for partners with Stripe Connect...');

    const { data, error } = await supabase
        .from('partners')
        .select('id, business_name, contact_email, stripe_account_id, payout_iban')
        .not('stripe_account_id', 'is', null)
        .neq('stripe_account_id', '');

    if (error) {
        console.error('❌ Error fetching partners:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('ℹ️ No partners found with Stripe Connect.');
    } else {
        const fs = require('fs');
        fs.writeFileSync('stripe_users_output.json', JSON.stringify(data, null, 2));
        console.log(`✅ Found ${data.length} partners. output saved to stripe_users_output.json`);
    }
}

listStripeUsers().catch(console.error);
