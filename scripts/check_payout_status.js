
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayoutStatus() {
    console.log("🔍 Checking Payouts Status...");

    const { data: payouts, error } = await supabase
        .from('payouts')
        .select('id, net_payout_amount, status, stripe_transfer_id, paid_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ Error:", error);
        return;
    }

    console.log(JSON.stringify(payouts, null, 2));
}

checkPayoutStatus();
