
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260113_enable_feedback_cron_retry.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('Applying migration:', migrationPath)

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
        console.error('Error applying migration:', error)
    } else {
        console.log('Migration applied successfully!')
        console.log('Cron job "send-feedback-emails" should now be scheduled.')
    }
}

applyMigration()
