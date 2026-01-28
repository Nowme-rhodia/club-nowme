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

async function fixMyleneSub() {
    console.log('🔧 Fixing Mylene Subscription (Retry)...')
    const email = 'mylen.nicolas@gmail.com'

    // 1. Get User
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const user = users.find(u => u.email === email)

    if (!user) {
        console.error(`❌ User NOT FOUND`)
        return
    }

    // 2. Prepare Subscription Data WITHOUT plan_id
    const startDate = new Date('2026-01-26T00:00:00Z')
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // Check if sub already exists now
    const { data: existing } = await supabaseAdmin.from('subscriptions').select('id').eq('user_id', user.id).maybeSingle()
    if (existing) {
        console.log('✅ Subscription already exists (unexpected?). ID:', existing.id)
        return
    }

    const subData = {
        user_id: user.id,
        status: 'active',
        stripe_subscription_id: 'sub_manual_paypal_' + Date.now(),
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        cancel_at_period_end: false
        // Removed plan_id
    }

    console.log('📝 Inserting Subscription:', subData)

    const { error: subError, data: newSub } = await supabaseAdmin
        .from('subscriptions')
        .insert(subData)
        .select()
        .single()

    if (subError) {
        console.error('❌ Failed to insert subscription:', subError)
    } else {
        console.log('✅ Subscription inserted SUCCESSFULLY:', newSub.id)
    }
}

fixMyleneSub()
