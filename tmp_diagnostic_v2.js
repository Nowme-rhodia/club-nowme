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

    log('--- 1. Recent Users and their Subscription Status ---')
    const { data: recentUsers, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, user_id, email, first_name, created_at, sub_auto_recap, partner_id')
        .order('created_at', { ascending: false })
        .limit(20)

    if (usersError) log('Error fetching users: ' + JSON.stringify(usersError))
    else {
        for (const u of recentUsers) {
            const { data: sub } = await supabaseAdmin
                .from('subscriptions')
                .select('status, plan_id')
                .eq('user_id', u.user_id)
                .single()

            const subStatus = sub ? sub.status : 'NONE'
            log(`${u.created_at} | ${u.email} | Profile Sub: ${u.sub_auto_recap} | DB Sub Table Status: ${subStatus}`)
        }
    }

    log('\n--- 2. Checking Tuesday Recap Cron Logs via SQL ---')
    // We'll try to use a direct SQL if possible via a known RPC or just checking again
    // But since we can't do raw SQL easily without a specific RPC, let's look for evidence of execution.
    // The weekly recap sends emails. Does it log anywhere else? 
    // Wait, I saw 'check_cron_logs.sql'. Let's see if I can run it or similar.

    log('\n--- 3. Checking for any "Newsletter" entries of type recap ---')
    const { data: news, error: newsErr } = await supabaseAdmin
        .from('admin_newsletters')
        .select('*')
        .ilike('subject', '%recap%')
        .order('created_at', { ascending: false })

    if (newsErr) log('Error checking newsletters: ' + JSON.stringify(newsErr))
    else if (news) {
        news.forEach(n => log(`Found newsletter: ${n.created_at} | ${n.subject} | ${n.status}`))
    } else {
        log('No recap newsletters found in admin_newsletters table.')
    }

    fs.writeFileSync('diagnostic_results_v2.txt', output)
}

diagnostic()
