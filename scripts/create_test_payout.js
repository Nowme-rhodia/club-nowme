
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
    console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestPayout() {
    console.log("🧪 Creating Test Payout data...");

    // 1. Get Partner 'Nowme'
    const { data: partners, error } = await supabase
        .from('partners')
        .select('id, business_name, stripe_account_id')
        .eq('business_name', 'Nowme');

    if (error || !partners || partners.length === 0) {
        console.error("❌ Partner 'Nowme' not found.");
        return;
    }

    const partner = partners[0];
    console.log(`Partner ID: ${partner.id}`);

    // 2. Insert Payout
    const { data: payout, error: insertError } = await supabase
        .from('payouts')
        .insert({
            partner_id: partner.id,
            period_start: '2025-01-01',
            period_end: '2025-01-31',
            total_amount_collected: 10.00,
            commission_amount: 1.00,
            commission_tva: 0.20,
            net_payout_amount: 8.80, // This is what will be transferred
            status: 'pending'
        })
        .select()
        .single();

    if (insertError) {
        console.error("❌ Error inserting payout:", insertError);
    } else {
        console.log("✅ Test Payout Created!");
        console.log(`   ID: ${payout.id}`);
        console.log(`   Amount: ${payout.net_payout_amount}€`);
        console.log(`   Status: ${payout.status}`);
    }
}

createTestPayout();
