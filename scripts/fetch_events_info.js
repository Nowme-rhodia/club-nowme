
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- CHECKING TABLES ---');

    // Try to query offers just to confirm connection
    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id')
        .limit(1);

    if (offersError) console.log("Offers table error:", offersError.message);
    else console.log("Offers table exists. Count:", offers.length);

    // Try to list tables via rpc if a function exists (unlikely), 
    // or use a raw query if we had pg client, but we don't.
    // We can try fetching 'information_schema.tables' via supabase client? 
    // Usually denied. But let's try.

    /*
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public');
      // usage: supabase.from('...').select() usually maps to public schema only unless configured
    */

    // Alternative: Try 'events' variants
    const setup = ['events', 'club_event', 'agenda', 'calendar', 'meetings'];
    for (const t of setup) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error) console.log(`Table '${t}' EXISTS!`);
        else console.log(`Table '${t}': ${error.message}`);
    }
}

main();
