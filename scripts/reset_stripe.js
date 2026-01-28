
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetStripe() {
    console.log("Resetting Stripe connection for Rhodia...");
    const { error } = await supabase
        .from('partners')
        .update({
            stripe_account_id: null,
            stripe_charges_enabled: false
        })
        .eq('contact_email', 'rhodia@nowme.fr');

    if (error) console.error("Error resetting:", error);
    else console.log("Stripe connection reset. The user can now re-onboard.");
}

resetStripe();
