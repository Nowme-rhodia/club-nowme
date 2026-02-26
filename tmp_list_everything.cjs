const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    console.log('--- 1. Listing All Public Tables ---');
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
    });
    if (tablesError) console.error('Tables Error:', tablesError);
    else console.table(tables);

    console.log('\n--- 2. Auditing nowme.club@gmail.com ---');
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', 'nowme.club@gmail.com')
        .single();

    if (profileError) console.error('Profile Error:', profileError);
    else {
        console.log('User Profile found:');
        console.log(`  - sub_auto_recap: ${profile.sub_auto_recap}`);
        console.log(`  - partner_id: ${profile.partner_id}`);
        console.log(`  - is_admin: ${profile.is_admin}`);
    }

    console.log('\n--- 3. Checking for any "log" or "notif" tables in any schema ---');
    const { data: allTables, error: allTablesError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%log%' OR table_name ILIKE '%notif%' OR table_name ILIKE '%history%';"
    });
    if (allTablesError) console.error('All Tables Error:', allTablesError);
    else console.table(allTables);
}

listTables();
