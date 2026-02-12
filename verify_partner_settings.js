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

async function checkPartner() {
    console.log('🔍 Checking Partner Settings...')

    // Search by contact_email
    const { data: partners, error } = await supabaseAdmin
        .from('partners')
        .select('id, business_name, contact_email, notification_settings')
        .ilike('contact_email', '%rhodia%')

    if (error) {
        console.error('❌ Error fetching partners:', error)
        return
    }

    if (partners && partners.length > 0) {
        console.log('✅ Found partners by email (rhodia):')
        partners.forEach(p => {
            console.log('--- Partner Found ---')
            console.log(`ID: ${p.id}`)
            console.log(`Name: ${p.business_name}`)
            console.log(`Email: ${p.contact_email}`) // This is the critical one
            console.log(`Settings: ${JSON.stringify(p.notification_settings, null, 2)}`)
        })
    } else {
        console.log('⚠️ No partner found with contact_email like %rhodia%')
    }

    // Also check by business name
    const { data: partnersByName } = await supabaseAdmin
        .from('partners')
        .select('id, business_name, contact_email, notification_settings')
        .ilike('business_name', '%rhodia%')

    if (partnersByName && partnersByName.length > 0) {
        console.log('\n✅ Found partners by name (rhodia):')
        partnersByName.forEach(p => {
            console.log('--- Partner Found ---')
            console.log(`ID: ${p.id}`)
            console.log(`Name: ${p.business_name}`)
            console.log(`Email: ${p.contact_email}`)
            console.log(`Settings: ${JSON.stringify(p.notification_settings, null, 2)}`)
        })
    }
}

checkPartner()
