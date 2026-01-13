
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkCron() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT * FROM cron.job;"
    })

    if (error) {
        console.error('Error checking cron jobs:', error)
    } else {
        console.table(data)
    }
}

checkCron()
