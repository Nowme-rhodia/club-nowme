import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectFeedback() {
    console.log('Inspecting feedback schema...');

    await supabase.rpc('exec_sql', { sql_query: "NOTIFY pgrst, 'reload config';" });
    await new Promise(r => setTimeout(r, 500));

    const { data, error } = await supabase.from('feedback').select('*').limit(1);

    if (error) {
        console.error('Error fetching feedback:', error);
        // If table exists but empty, error might be null and data empty
        // If table doesn't exist, error 404 or 42P01
    } else {
        console.log('Feedback table accessible (RLS might block rows but table exists).');
    }

    // Get columns using SQL
    const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql_query: `
        DO $$ 
        DECLARE r record;
        BEGIN 
            FOR r IN SELECT column_name FROM information_schema.columns WHERE table_name = 'feedback' LOOP
                RAISE NOTICE 'Column: %', r.column_name;
            END LOOP;
        END $$;
      `
    });
    // We can't see NOTICE output easily.
    // Let's use the node script approach from before that printed keys if we can insert a dummy row?
    // We can't insert if policies are broken/missing (implicit deny).

    // Just try to apply the fixed policies.
}

inspectFeedback();
