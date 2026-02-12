import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

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

async function getBookingId() {
    const { data: installments } = await supabaseAdmin
        .from('payment_installments')
        .select('*')
        .order('paid_at', { ascending: false })
        .limit(1)

    if (installments && installments.length > 0) {
        const inst = installments[0]
        const { data: plan } = await supabaseAdmin
            .from('payment_plans')
            .select('*')
            .eq('id', inst.plan_id)
            .single()

        if (plan) {
            fs.writeFileSync('last_booking_id.txt', plan.booking_id)
            console.log('Saved to last_booking_id.txt')
        }
    }
}

getBookingId()
