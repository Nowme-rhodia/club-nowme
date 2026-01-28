import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function checkMylene() {
    console.log('🔍 Checking Mylene status (Concise v3)...')
    const email = 'mylen.nicolas@gmail.com'

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const user = users.find(u => u.email === email)

    if (!user) {
        console.log(`❌ User NOT FOUND`)
        return
    }
    console.log(`✅ User ID: ${user.id}`)

    // Removed 'role' from select as it is likely not a column
    const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, user_id, email, subscription_status, subscription_type, partner_id')
        .eq('user_id', user.id)
        .single()

    if (error) {
        console.log('❌ Profile Select Error:', error)
    } else {
        console.log('👤 Profile Summary:', JSON.stringify(profile, null, 2))
    }

    const { data: sub, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (subError) {
        console.log('❌ Subscription Select Error:', subError)
    } else if (sub) {
        console.log('💳 Subscription Table:', JSON.stringify(sub, null, 2))
    } else {
        console.log('⚠️ NO entry in "subscriptions" table.')
    }
}

checkMylene()
