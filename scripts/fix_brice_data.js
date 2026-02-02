
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Try to get the service role key first to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or keys");
    process.exit(1);
}

// Log which key type we are using (safe log)
console.log(`Using key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const PARTNER_ID = '9fbc63b6-9882-4990-93fa-90bd73086747';

async function updatePartner() {
    console.log(`Updating partner ${PARTNER_ID}...`);

    const updates = {
        business_name: "Brice Caumont EIRL",
        contact_name: "Brice Caumont, Réflexologue, Maître-Enseignant de Reiki et Hypnopraticien",
        siret: "788 538 288 00010"
    };

    const { data, error } = await supabase
        .from('partners')
        .update(updates)
        .eq('id', PARTNER_ID)
        .select();

    if (error) {
        console.error("Error updating partner:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Update successful!");
            console.log("New data:", data);
        } else {
            console.log("Update returned no data. Check ID or RLS policies.");
        }
    }
}

updatePartner();
