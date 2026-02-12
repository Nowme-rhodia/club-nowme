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

async function traceInstallment() {
    console.log('🔍 Tracing Recent Installment...')

    // 1. Get recent installment
    const { data: installments, error: instError } = await supabaseAdmin
        .from('payment_installments')
        .select('*')
        .order('paid_at', { ascending: false })
        .limit(1)

    if (instError || !installments || installments.length === 0) {
        console.log('❌ No recent installments found')
        return
    }

    const inst = installments[0]
    console.log(`💳 Installment ID: ${inst.id}`)
    console.log(`   Paid At: ${inst.paid_at}`)
    console.log(`   Amount: ${inst.amount}`)
    console.log(`   Plan ID: ${inst.plan_id}`)

    // 2. Get Plan
    const { data: plan, error: planError } = await supabaseAdmin
        .from('payment_plans')
        .select('*')
        .eq('id', inst.plan_id)
        .single()

    if (planError) {
        console.log('❌ Plan not found')
        return
    }

    console.log(`📅 Plan ID: ${plan.id}`)
    console.log(`   Booking ID: ${plan.booking_id}`)

    // 3. Get Booking
    const { data: booking, error: bookError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', plan.booking_id)
        .single()

    if (bookError) {
        console.log('❌ Booking not found')
        return
    }

    console.log(`📖 Booking ID: ${booking.id}`)
    console.log(`   Created At: ${booking.created_at}`)
    console.log(`   Partner ID: ${booking.partner_id}`)
    console.log(`   Status: ${booking.status}`)

    // 4. Get Partner for this booking
    const { data: partner, error: partError } = await supabaseAdmin
        .from('partners')
        .select('business_name, contact_email')
        .eq('id', booking.partner_id)
        .single()

    console.log(`__BOOKING_ID_START__${booking.id}__BOOKING_ID_END__`)
}

traceInstallment()
