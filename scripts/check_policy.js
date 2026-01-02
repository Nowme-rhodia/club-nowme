
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Try standard env vars
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing env vars VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicy() {
    console.log("Checking policy for 'TEST ANNULATION'...");

    // Check Offer
    const { data: offers, error: offerError } = await supabase
        .from('offers')
        .select('id, title, cancellation_policy, cancellation_conditions')
        .eq('title', 'TEST ANNULATION');

    if (offerError) {
        console.error("Offer Error:", offerError);
    } else {
        console.log("Offers found:", JSON.stringify(offers, null, 2));

        // Update to Strict
        console.log("Updating to 'strict'...");
        const { error: updateError } = await supabase
            .from('offers')
            .update({ cancellation_policy: 'strict' })
            .eq('title', 'TEST ANNULATION');

        if (updateError) console.error("Update Error:", updateError);
        else console.log("✅ Updated 'TEST ANNULATION' to 'strict'.");
    }
}

checkPolicy();
