
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
    console.log('Checking schemas...')
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT nspname FROM pg_namespace;"
    })

    if (error) console.error(JSON.stringify(error, null, 2))
    else console.table(data)
}

check()
