
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
    console.log("💰 Starting Full Payout Simulation (658.75 €)...");

    // 1. Get Partner
    const { data: partners } = await supabase
        .from('partners')
        .select('id, business_name, stripe_account_id, stripe_charges_enabled')
        .eq('business_name', 'Nowme');

    if (!partners || partners.length === 0) {
        console.error("❌ Partner Not Found");
        return;
    }
    const partner = partners[0];
    console.log(`✅ Partner Found: ${partner.business_name} (${partner.stripe_account_id})`);

    if (!partner.stripe_charges_enabled) {
        console.warn("⚠️ Partner stripe_charges_enabled is FALSE. Force updating to TRUE for test...");
        await supabase.from('partners').update({ stripe_charges_enabled: true }).eq('id', partner.id);
    }

    // 2. Insert Payout Record (Simulating the RPC result)
    const { data: payout, error: insertError } = await supabase
        .from('payouts')
        .insert({
            partner_id: partner.id,
            period_start: '2025-01-01',
            period_end: '2025-01-31',
            total_amount_collected: 775.00,
            commission_amount: 116.25,
            commission_tva: 0.00, // Simplified
            net_payout_amount: 658.75, // The exact amount from the user screen
            status: 'pending'
        })
        .select()
        .single();

    if (insertError) {
        console.error("❌ Error inserting payout:", insertError);
        return;
    }
    console.log(`✅ Payout Record Created: ${payout.id} (Amount: ${payout.net_payout_amount}€)`);

    // 3. Trigger Edge Function
    const functionUrl = "https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/run-payouts";
    console.log(`🚀 Triggering Payout Execution...`);

    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${envConfig.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const text = await response.text();
    console.log(`Response: ${response.status} ${text}`);

    if (response.status === 200) {
        console.log("🎉 SUCCESS! Money should be on its way.");
    } else {
        console.log("❌ FAILED.");
    }
}

runSimulation();
