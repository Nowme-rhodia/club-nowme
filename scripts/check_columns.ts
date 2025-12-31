
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import "https://deno.land/std@0.192.0/dotenv/load.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || process.env.VITE_SUPABASE_URL;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY");
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking 'partners' table columns...");

    // We can't query information_schema directly easily with JS client unless we use rpc or just try to select * and see keys

    const { data, error } = await supabase
        .from('partners')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching partners:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found on first record:", Object.keys(data[0]));
    } else {
        console.log("No data in partners table, cannot infer columns from result.");
        // Try inserting a dummy to fail or just trust the error from before.
        // Actually, let's try to RPC if possible, but simplest is to just see the object keys.
    }

    // Check specific columns by trying to select them
    const columnsToCheck = ['siret', 'payout_iban', 'stripe_account_id', 'calendly_url', 'address', 'business_name', 'tva_intra'];

    for (const col of columnsToCheck) {
        const { error: colError } = await supabase.from('partners').select(col).limit(1);
        if (colError) {
            console.log(`❌ Column '${col}' seems missing or inaccessible:`, colError.message);
        } else {
            console.log(`✅ Column '${col}' exists and is accessible.`);
        }
    }
}

checkSchema();
