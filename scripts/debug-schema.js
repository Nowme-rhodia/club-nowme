
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    console.log('--- Columns in bookings ---');
    const { data: columns, error: colError } = await supabase
        .rpc('exec_sql', { sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings';" });

    // Fallback if RPC not available/fails, try direct query via postgrest if allowed (usually not on info schema)
    // Actually our db-migrate.js uses exec_sql which wraps EXECUTE.
    // But we can't easily call it from here without the RPC wrapper being present. 
    // db-migrate.js creates it. 

    // Let's use the same logic as db-migrate.js to execute verification SQL via the rpc 'exec_sql'.
    // Assuming 'exec_sql' exists from previous runs.

    if (colError) {
        console.error('RPC Error:', colError);
        // Try to create it? No, assume it exists or use standard client if permitted on pg_catalog? No.
    } else {
        console.log(columns);
    }

    // Instead of complex RPC, let's just use the fact that we can run raw SQL via the `db-migrate.js` mechanism?
    // Or just write a migration that does DO $$ RAISE NOTICE ... $$; 

    // Simplest: just use the supabase client to try the problematic query and see the error details?

    console.log('--- Testing Fetch ---');
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            offer:offers(title),
            user:user_profiles(first_name, last_name, email)
          `)
        .limit(1);

    if (error) {
        console.error('Fetch Error:', error);
        console.log('Hint: ' + error.hint);
        console.log('Message: ' + error.message);
    } else {
        console.log('Fetch Success:', data);
    }
}

inspect();
