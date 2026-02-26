import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

async function diagnostic() {
    let output = ''
    const log = (msg) => {
        console.log(msg)
        output += msg + '\n'
    }

    log('--- 1. Checking Subscribers ---')
    const { count, error: countError } = await supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

    log(`Total user profiles: ${count}`)

    const { data: recentUsers, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('email, first_name, created_at, sub_auto_recap, partner_id')
        .order('created_at', { ascending: false })
        .limit(30)

    if (usersError) log('Error fetching subscribers: ' + JSON.stringify(usersError))
    else {
        recentUsers.forEach(u => {
            log(`${u.created_at} | ${u.email} | ${u.first_name} | Recap: ${u.sub_auto_recap} | Partner: ${u.partner_id}`)
        })
    }

    log('\n--- 2. Checking Recent Recap Cron Job Runs ---')
    // We'll check admin_newsletters for any "Weekly Recap" entries
    const { data: logs, error: logsError } = await supabaseAdmin
        .from('admin_newsletters')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    if (logsError) {
        log('Admin newsletters table error: ' + JSON.stringify(logsError))
    } else {
        logs.forEach(l => {
            log(`${l.created_at} | ${l.subject} | Status: ${l.status}`)
        })
    }

    log('\n--- 3. Checking for recipients of the recap ---')
    const { count: recapRecipients, error: recipientsError } = await supabaseAdmin
        .from('user_profiles')
        .select('email', { count: 'exact', head: true })
        .eq('sub_auto_recap', true)
        .is('partner_id', null)
        .not('email', 'is', null)

    log(`Potential recap recipients based on current flags: ${recapRecipients}`)

    log('\n--- 4. Checking recent content (to see if recap was skipped) ---')
    const lastTuesday = new Date("2026-02-24T06:30:00Z");
    const oneWeekBeforeTuesday = new Date(lastTuesday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekBeforeTuesdayStr = oneWeekBeforeTuesday.toISOString();

    const { count: newOffers } = await supabaseAdmin
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gt('created_at', oneWeekBeforeTuesdayStr)

    const { count: newPartners } = await supabaseAdmin
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gt('created_at', oneWeekBeforeTuesdayStr)

    log(`Content found for last Tuesday's recap period: ${newOffers} offers, ${newPartners} partners`)

    fs.writeFileSync('diagnostic_results.txt', output)
    log('\nResults saved to diagnostic_results.txt')
}

diagnostic()
