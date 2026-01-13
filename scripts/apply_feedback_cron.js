
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
    // Correct path resolution from the scripts directory
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260113_enable_feedback_cron_retry.sql')

    try {
        const sql = fs.readFileSync(migrationPath, 'utf-8')

        // Replace the dynamic SQL token with the actual Service Key
        // AND prepend CREATE EXTENSION logic
        const finalSql = `CREATE EXTENSION IF NOT EXISTS "pg_net" SCHEMA public; ` + sql.replace(
            `current_setting('request.jwt.claim.sub', true)`,
            `'${supabaseServiceKey}'`
        )

        console.log('Applying migration:', migrationPath)

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: finalSql })

        if (error) {
            console.error('Error applying migration:', JSON.stringify(error, null, 2))
        } else {
            console.log('Migration applied successfully!')
            console.log('Cron job "send-feedback-emails" should now be scheduled.')
        }

    } catch (err) {
        console.error("File read error:", err)
    }
}

applyMigration()
