import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

async function diag() {
    console.log('Dysagnostic: Listing User Profiles...')
    const { data, error } = await supabaseAdmin.from('user_profiles').select('*').limit(5)
    if (error) console.error('Error:', error)
    else console.table(data)

    console.log('Diagnostic: Listing Partners...')
    const { data: partners, error: pError } = await supabaseAdmin.from('partners').select('*').limit(5)
    if (pError) console.error('Error:', pError)
    else console.table(partners)
}

diag()
