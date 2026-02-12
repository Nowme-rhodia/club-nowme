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

async function checkOtherActivity() {
    console.log('🔍 Checking Activity (Safe Mode)...')

    try {
        // 1. Check Wallet Transactions
        const { data: wallets, error: walletError } = await supabaseAdmin
            .from('wallet_transactions')
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .limit(3)

        if (walletError) console.log('❌ Wallet Error')
        else {
            console.log(`💰 Wallets:`)
            wallets.forEach(w => console.log(`  ${w.created_at}`))
        }
    } catch (e) { console.log('Error checking wallets') }

    try {
        // 2. Check Payment Plans
        const { data: plans, error: planError } = await supabaseAdmin
            .from('payment_plans')
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .limit(3)

        if (planError) console.log('❌ Plans Error')
        else {
            console.log(`📅 Plans:`)
            plans.forEach(p => console.log(`  ${p.created_at}`))
        }
    } catch (e) { console.log('Error checking plans') }

    try {
        // 3. Check Payment Installments
        const { data: installments, error: instError } = await supabaseAdmin
            .from('payment_installments')
            .select('id, created_at, paid_at')
            .order('created_at', { ascending: false })
            .limit(3)

        if (instError) console.log('❌ Installments Error')
        else {
            console.log(`💳 Installments:`)
            installments.forEach(i => console.log(`  Cr:${i.created_at} Pd:${i.paid_at}`))
        }
    } catch (e) { console.log('Error checking installments') }
}

checkOtherActivity()
