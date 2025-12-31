
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars from .env file manually since we are in a script
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPartnerStatus() {
    console.log("🔍 Checking partner status for 'rhodia@nowme.fr'...");

    // 1. Get User ID
    const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id, partner_id')
        .eq('first_name', 'Rhodia') // Assuming Rhodia is the name based on context
        .single();

    if (userError) {
        // Fallback checks
        console.log("Could not find by name Rhodia, trying to list partners directly.");
    }

    const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, business_name, stripe_account_id, stripe_charges_enabled')
        .eq('business_name', 'Nowme');

    if (partnersError) {
        console.error("Error fetching partners:", partnersError);
        return;
    }

    if (partners && partners.length > 0) {
        partners.forEach(p => {
            console.log(`\n🏢 Partner: ${p.business_name}`);
            console.log(`   - ID: ${p.id}`);
            console.log(`   - Stripe Account ID: ${p.stripe_account_id ? p.stripe_account_id : '❌ Not set'}`);
            console.log(`   - Charges Enabled: ${p.stripe_charges_enabled ? '✅ YES' : '❌ NO'}`);
        });
    } else {
        console.log("No partner found with name 'Nowme'.");
    }
}

checkPartnerStatus();
