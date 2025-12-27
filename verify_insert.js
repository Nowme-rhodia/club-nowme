import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function testInsert() {
    const email = 'entreprisepartenaire@gmail.com'
    const password = 'MvPbSa2Fblb2'

    const { data: { session } } = await supabase.auth.signInWithPassword({ email, password })
    const user = session.user

    // Get partner
    const { data: profile } = await supabase.from('user_profiles').select('partner_id').eq('user_id', user.id).single()
    const partnerId = profile.partner_id

    console.log('Partner ID:', partnerId)

    const offerData = {
        partner_id: partnerId,
        title: 'Test Insert Script',
        description: 'Testing schema validity',
        street_address: '10 Rue de Paris',
        status: 'draft',
        is_approved: false,
        calendly_url: null,
        commission_rate: 10
    };

    // Try Insert
    console.log('Inserting...', offerData)
    const { data, error } = await supabase.from('offers').insert(offerData).select().single()

    if (error) {
        console.error('❌ Insert Error:', error)
    } else {
        console.log('✅ Insert Success:', data.id)
    }
}

testInsert()
