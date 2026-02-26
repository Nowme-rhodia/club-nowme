const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCron() {
    console.log('--- 1. Checking Extensions ---');
    const { data: ext, error: extError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT extname FROM pg_extension WHERE extname = 'pg_cron';"
    });
    if (extError) console.error('Extension Error:', extError);
    else console.table(ext);

    console.log('\n--- 2. Listing All Scheduled Jobs ---');
    const { data: jobs, error: jobsError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT * FROM cron.job;"
    });
    if (jobsError) console.error('Jobs Error:', jobsError);
    else console.table(jobs);

    console.log('\n--- 3. Recent Job Run Details (All Jobs) ---');
    const { data: runs, error: runsError } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT 
                r.jobid,
                j.jobname,
                r.runid,
                r.status,
                r.return_message,
                r.start_time,
                r.end_time
            FROM cron.job_run_details r
            LEFT JOIN cron.job j ON r.jobid = j.jobid
            ORDER BY r.start_time DESC 
            LIMIT 20;
        `
    });

    if (runsError) {
        console.error('Runs Error:', runsError);
    } else {
        console.table(runs);
    }

    console.log('\n--- 4. Checking Subscriber List ---');
    const { count, data: samples, error: subError } = await supabase
        .from('user_profiles')
        .select('email, first_name', { count: 'exact' })
        .eq('sub_auto_recap', true)
        .is('partner_id', null)
        .not('email', 'is', null);

    if (subError) console.error('Subscriber Error:', subError);
    else {
        console.log(`Total subscribers found: ${count}`);
        const isTargetIn = samples.some(s => s.email === 'nowme.club@gmail.com');
        console.log(`Is nowme.club@gmail.com in current list? ${isTargetIn}`);
    }
}

checkCron();
