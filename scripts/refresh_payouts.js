
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function refreshPayouts() {
    console.log("Refreshing payouts...");
    const today = new Date().toISOString().split('T')[0]; // '2026-01-28'
    const { error } = await supabase.rpc('generate_monthly_partner_payouts', { p_ref_date: today });

    if (error) console.error("Error refreshing payouts:", error);
    else console.log("Payouts refreshed successfully.");
}

refreshPayouts();
