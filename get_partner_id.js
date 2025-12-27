import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function getPartnerId() {
    const email = 'entreprisepartenaire@gmail.com'
    const password = 'MvPbSa2Fblb2'

    const { data: { session } } = await supabase.auth.signInWithPassword({ email, password })
    const user = session.user

    const { data: profile } = await supabase.from('user_profiles').select('partner_id').eq('user_id', user.id).single()
    console.log('REAL PARTNER ID:', profile.partner_id)
}

getPartnerId()
