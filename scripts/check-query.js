import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- Checking Function Definition ---');
    const { data: funcDetails, error: funcError } = await supabase.rpc('exec_sql', {
        sql_query: `select prosrc from pg_proc where proname = 'get_marketing_targets';`
    });

    // NOTE: exec_sql returns void usually, so we might not see the result unless we change exec_sql to return generated table or we loop.
    // Actually, exec_sql as defined in db-migrate.js returns VOID.
    // So we cannot Read data with it.

    // We can use supabase.rpc to call the function and see error.
    // We can also use a direct query if we had direct access, but we only have Client.

    // Let's try to create a temporary RPC that returns text to debug.

    const debugSql = `
    create or replace function debug_query() returns text as $$
    declare
      result text;
    begin
      select prosrc into result from pg_proc where proname = 'get_marketing_targets';
      return result;
    end;
    $$ language plpgsql security definer;
  `;

    await supabase.rpc('exec_sql', { sql_query: debugSql });

    const { data: source, error: sourceError } = await supabase.rpc('debug_query');
    if (sourceError) console.error('Error fetching source:', sourceError);
    else console.log('Function Source Sample:', source ? source.substring(0, 200) + '...' : 'NULL');

    console.log('\n--- Testing Queries Directly ---');

    // Test Full Hesitantes Logic
    const testHesitantesFull = `
    do $$
    begin
        perform
            up.user_id
        from user_profiles up
        left join subscriptions s on up.user_id = s.user_id
        where
            up.email is not null
            and not exists (
                select 1 from marketing_campaign_logs mcl
                where mcl.email = up.email
            );
    end;
    $$;
  `;

    const { error: error3 } = await supabase.rpc('exec_sql', { sql_query: testHesitantesFull });
    console.log('Hesitantes Full Check:', error3 ? error3.message : 'OK');

    // Test Full Exploratrices Logic
    const testExploratricesFull = `
    do $$
    begin
        perform
            co.customer_email
        from customer_orders co
        where
            co.customer_email is not null
            and not exists (
                select 1 from marketing_campaign_logs mcl
                where mcl.email = co.customer_email
            );
    end;
    $$;
  `;

    const { error: error4 } = await supabase.rpc('exec_sql', { sql_query: testExploratricesFull });
    console.log('Exploratrices Full Check:', error4 ? error4.message : 'OK');
}

main();
