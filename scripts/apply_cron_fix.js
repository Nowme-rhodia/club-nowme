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

const FIX_SQL = `
-- FIX CRON JOBS AUTHENTICATION
-- We use the SERVICE_ROLE_KEY directly because pg_cron cannot access app.settings.* securely without extra config.

-- 1. Unschedule all problematic jobs
SELECT cron.unschedule('squad-reminders-daily');
SELECT cron.unschedule('monthly-recap');
SELECT cron.unschedule('send-weekly-recap');
SELECT cron.unschedule('process-newsletters');
SELECT cron.unschedule('monthly-payouts');
SELECT cron.unschedule('send-marketing-campaigns');
SELECT cron.unschedule('send-onboarding-reminders');
SELECT cron.unschedule('send-booking-reminder');
SELECT cron.unschedule('send-reengagement-email');
SELECT cron.unschedule('send-low-stock-alert');
SELECT cron.unschedule('send-abandoned-signup-reminders');
SELECT cron.unschedule('send-feedback-emails');


-- 2. Reschedule with CORRECT HEADERS

-- Job: send-abandoned-signup-reminders (Hourly)
SELECT cron.schedule(
    'send-abandoned-signup-reminders',
    '0 * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-abandoned-signup-reminder',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        )
      ) as request_id;
    $$
);

-- Job: squad-reminders-daily (Daily 08:00)
SELECT cron.schedule(
    'squad-reminders-daily',
    '0 8 * * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-squad-reminders',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: monthly-recap (Monthly 1st at 09:00)
SELECT cron.schedule(
    'monthly-recap',
    '0 9 1 * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-monthly-recap',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: send-weekly-recap (Weekly Tuesday 06:30)
SELECT cron.schedule(
    'send-weekly-recap',
    '30 6 * * 2',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-weekly-recap',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: send-feedback-emails (Hourly)
-- Note: Originally used a user JWT. We switch to service role and ensure the function handles it.
SELECT cron.schedule(
    'send-feedback-emails',
    '0 * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-feedback-email',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: process-newsletters (Every 30 mins)
SELECT cron.schedule(
    'process-newsletters',
    '*/30 * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/process-scheduled-newsletters',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        )
      ) as request_id;
    $$
);

-- Job: monthly-payouts (Monthly 1st at 02:00)
SELECT cron.schedule(
    'monthly-payouts',
    '0 2 1 * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/run-payouts',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        )
      ) as request_id;
    $$
);

-- Job: send-marketing-campaigns (Daily 08:00)
SELECT cron.schedule(
    'send-marketing-campaigns',
    '0 8 * * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-marketing-campaigns',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: send-onboarding-reminders (Weekly Mon 09:00)
SELECT cron.schedule(
    'send-onboarding-reminders',
    '0 9 * * 1',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-onboarding-reminders',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: send-booking-reminder (Daily 08:00)
SELECT cron.schedule(
    'send-booking-reminder',
    '0 8 * * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-booking-reminder',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: send-reengagement-email (Weekly Tue 10:00)
SELECT cron.schedule(
    'send-reengagement-email',
    '0 10 * * 2',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-reengagement-email',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Job: send-low-stock-alert (Daily 09:00)
SELECT cron.schedule(
    'send-low-stock-alert',
    '0 9 * * *',
    $$
    SELECT
      net.http_post(
        url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-low-stock-alert',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ${supabaseServiceKey}'
        ),
        body:='{}'::jsonb
      ) as request_id;
    $$
);
`;

async function applyFix() {
    console.log('Applying Cron Job Fixes...');

    // We use the exec_sql RPC we verified earlier
    const { error } = await supabase.rpc('exec_sql', { sql_query: FIX_SQL });

    if (error) {
        console.error('Failed to apply fix:', error);

        // Fallback: Try REST API directly if RPC access has issues but key is valid
        try {
            console.log('Retrying via raw REST...');
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ sql_query: FIX_SQL })
            });

            if (!response.ok) {
                const txt = await response.text();
                console.error('Raw REST failed:', txt);
            } else {
                console.log('Fix applied successfully via Raw REST!');
            }
        } catch (e) {
            console.error('Retry failed:', e);
        }

    } else {
        console.log('Fix applied successfully!');
    }
}

applyFix();
