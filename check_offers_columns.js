
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkColumns() {
    const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'offers' });
    // If rpc doesn't exist, this might fail. Let's try to just select one row to see structure if rpc fails

    if (error) {
        console.log("RPC failed, trying select * limit 1");
        const { data: offers, error: err2 } = await supabase.from('offers').select('*').limit(1);
        if (err2) {
            console.error("Error fetching offers:", err2);
        } else {
            if (offers.length > 0) {
                console.log("Columns inferred from first row:", Object.keys(offers[0]));
                // Also need to know types potentially.
            } else {
                console.log("No offers found to infer columns.");
            }
        }
    } else {
        console.log("Columns:", data);
    }
}

// Fallback: try to read system catalog if possible (usually blocked for anon/service_role on cloud but might work locally)
// Actually service_role should have access.
async function checkSystemCatalog() {
    // This often doesn't work via PostgREST/JS client directly unless wrapped in RPC
    // Let's rely on the previous method.
}

checkColumns();
