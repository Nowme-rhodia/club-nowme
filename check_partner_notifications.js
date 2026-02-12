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

async function checkNotifications() {
    console.log('🔍 Checking Partner Notifications for Rhodia...')

    // 1. Get Partner ID
    const { data: partner } = await supabaseAdmin
        .from('partners')
        .select('id, business_name')
        .ilike('contact_email', '%rhodia%')
        .maybeSingle()

    if (!partner) {
        console.log('❌ Partner rhodia not found')
        return
    }

    console.log(`✅ Found Partner: ${partner.business_name} (${partner.id})`)

    // 2. Get Recent Notifications
    const { data: notifications, error } = await supabaseAdmin
        .from('partner_notifications')
        .select('*')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('❌ Error fetching notifications:', error)
        return
    }

    console.log(`📊 Found ${notifications.length} recent notifications:`)
    notifications.forEach(n => {
        console.log(`- [${n.created_at}] Type: ${n.type} | Title: ${n.title}`)
    })
}

checkNotifications()
