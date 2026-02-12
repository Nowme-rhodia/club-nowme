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

async function checkBookings() {
    console.log('🔍 Checking Recent Bookings for Rhodia...')

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

    console.log(`✅ Partner ID: ${partner.id}`)

    // 2. Get Recent Bookings (Pending or Confirmed) - SYSTEM WIDE
    const { data: bookings, error } = await supabaseAdmin
        .from('bookings')
        .select('id, created_at, status, amount, partner_id, offer_id, user_id')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('❌ Error fetching bookings:', error)
        return
    }

    console.log(`📊 Found ${bookings.length} system-wide recent bookings:`)
    bookings.forEach(b => {
        console.log(`- [${b.created_at}] Partner: ${b.partner_id} | Status: ${b.status} | Amt: ${b.amount}`)
    })
}

checkBookings()
