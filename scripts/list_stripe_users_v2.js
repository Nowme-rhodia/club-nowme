import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('partners')
        .select('business_name, contact_email, stripe_account_id, payout_iban')
        .not('stripe_account_id', 'is', null)
        .neq('stripe_account_id', '');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('--- START DATA ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('--- END DATA ---');
}

run().catch(err => console.error(err));
