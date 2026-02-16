import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureExecSql() {
    const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;

    // Try creating via REST API if it doesn't exist
    // We can't verify easily if it exists without runnign SQL, so we just try to create/replace it.
    // Using the raw fetch method as in db-migrate.js to ensure we hit the SQL endpoint if possible or just use existing RPC.
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_query: "SELECT 1" })
        });

        if (response.ok) {
            console.log('exec_sql RPC already exists and works.');
            return;
        }
    } catch (e) {
        // ignore
    }

    console.log('Attempting to create exec_sql function via REST...');
    // We try to inject it via the special SQL endpoint if Supabase exposes it, or via a magic query if possible. 
    // Actually, Supabase Management API is usually needed for raw SQL if RPC doesn't exist.
    // BUT, let's try the method from db-migrate.js which seemed to imply it might work:
    // It used /rest/v1/ with query param? No, it used POST to /rest/v1/rpc/exec_sql. 
    // If that failed, it tried POST /rest/v1/? It's weird.

    // Let's assume we might need to rely on the user having run db-migrate.js before.
    // If not, we can't easily run SQL without a connection.
}

async function inspectCron() {
    try {
        console.log('Connecting via Supabase JS Client...');

        // 1. Try to read directly if we have permissions (likely not on cron schema)
        // const { data, error } = await supabase.from('cron.job').select('*'); 
        // accessing schema via client is tricky.

        // 2. Use RPC equivalent to "SELECT * FROM cron.job"
        // We need a wrapper function because we can't run raw SQL from client unless we have exec_sql

        const sql = "CREATE OR REPLACE VIEW public.temp_cron_jobs AS SELECT * FROM cron.job;";
        // We can't run this without exec_sql.

        console.log('Checking for cron jobs via exec_sql...');
        // We'll try to create a temp view accessible to us, simply run a select and return it?
        // exec_sql returns VOID. We need one that returns JSON or records.

        // Let's create a useful helper function if we can.
        const createHelperSQL = `
        CREATE OR REPLACE FUNCTION get_cron_jobs()
        RETURNS TABLE(jobid bigint, schedule text, command text, nodename text, nodeport int, database text, username text, active boolean, jobname text)
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT * FROM cron.job;
        $$;
    `;

        // Try to run this via exec_sql
        let { error: execError } = await supabase.rpc('exec_sql', { sql_query: createHelperSQL });

        if (execError) {
            console.error('exec_sql failed or missing:', execError);
            console.log('Attempting to create exec_sql...');
            const createExecRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` },
                body: JSON.stringify({ sql_query: createHelperSQL })
            });

            if (!createExecRes.ok) {
                console.error('Could not create helper via REST either. Verify Supabase Service Key permissions.');
                // Fallback: Just try to Select from the table assuming we might have permissions?
                // Unlikely for cron schema.
            }
        }

        // Now call the helper
        const { data, error } = await supabase.rpc('get_cron_jobs');

        if (error) {
            console.error('Error fetching cron jobs:', error);
        } else {
            console.log('Current Cron Jobs:');
            data.forEach(job => {
                console.log(`\n----- Job: ${job.jobname} -----`);
                console.log(`Schedule: ${job.schedule}`);
                console.log(`Command: ${job.command}`);
            });
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

inspectCron();
