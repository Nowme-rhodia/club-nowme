
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
// Use the URL from the user's project (hardcoded or from env)
const projectUrl = process.env.VITE_SUPABASE_URL

if (!serviceKey || !projectUrl) {
    console.error('Missing env vars')
    process.exit(1)
}

const functionsUrl = projectUrl.replace('.co', '.co/functions/v1')

const sql = `
-- 1. Extensions should be enabled in Dashboard. 
-- We skip CREATE EXTENSION to avoid "dependent privileges" errors.

-- 2. Schedule Feedback Emails (Hourly)
-- unschedule removed to allow upsert
SELECT cron.schedule(
    'send-feedback-emails',
    '0 * * * *',
    $$
    SELECT
      net.http_post(
          url:='${functionsUrl}/send-feedback-email',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${serviceKey}"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 3. Schedule Weekly Recap (Tuesday 06:30)
SELECT cron.schedule(
    'send-weekly-recap',
    '30 6 * * 2',
    $$
    SELECT
      net.http_post(
          url:='${functionsUrl}/send-weekly-recap',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${serviceKey}"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 4. Check active jobs
SELECT * FROM cron.job;
`

fs.writeFileSync('manual_fix.sql', sql)
console.log('manual_fix.sql created.')
