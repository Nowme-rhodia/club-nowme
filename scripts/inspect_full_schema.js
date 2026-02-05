
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFullSchema() {
    const tables = ['offers', 'offer_variants', 'bookings']; // Added bookings just in case

    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            // If select * fails, maybe try to list columns another way?
            // Usually select * works if table exists.
            continue;
        }

        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]).join(', '));
            // Check for any date-like columns
            const dateCols = Object.keys(data[0]).filter(k => k.includes('date') || k.includes('time') || k.includes('at'));
            console.log('Date/Time Columns:', dateCols.join(', '));
        } else {
            console.log(`Table ${table} is reachable but has no rows (or RLS issue).`);
            // We can't see columns if no rows returned via simple select in Supabase JS client usually, 
            // unless we use specific introspection RPC. 
            // But we know 'offers' has rows.
        }
    }
}

inspectFullSchema();
