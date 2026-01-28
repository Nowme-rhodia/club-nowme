
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStripe() {
    const { data: partner } = await supabase
        .from('partners')
        .select('id, contact_email, stripe_account_id, stripe_details_submitted, stripe_charges_enabled')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    console.log("Current Partner Stripe Details:");
    console.log(JSON.stringify(partner, null, 2));
}

checkStripe();
