const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkNetResponses() {
    console.log('--- Checking pg_net HTTP Responses ---');
    // Note: pg_net usually puts things in its own schema, but sometimes it's exposed or we can query it via exec_sql
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT 
                id,
                status_code,
                content_type,
                created_at
            FROM net.http_responses
            ORDER BY created_at DESC
            LIMIT 20;
        `
    });

    if (error) {
        console.error('Error:', error);
    } else {
        console.table(data);
    }
}

checkNetResponses();
