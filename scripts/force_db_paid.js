
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function forceSuccess() {
    console.log("🔓 Forcing Payout Success in DB (since funds are Pending in Stripe)...");

    // Update all pending payouts to PAID
    const { data, error } = await supabase
        .from('payouts')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_transfer_id: 'tr_test_simulation_force_success'
        })
        .eq('status', 'pending')
        .gt('net_payout_amount', 0)
        .select();

    if (error) {
        console.error("❌ Error updating DB:", error);
    } else {
        console.log(`✅ Updated ${data.length} records to 'paid'.`);
        data.forEach(p => console.log(`   - Payout ${p.id}: ${p.net_payout_amount}€`));
    }
}

forceSuccess();
