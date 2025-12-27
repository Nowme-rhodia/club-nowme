import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function verify() {
    const email = 'entreprisepartenaire@gmail.com'
    const password = 'MvPbSa2Fblb2'

    console.log('🔑 Logging in...')
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (loginError) {
        console.error('❌ Login failed:', loginError)
        return
    }

    console.log('✅ Logged in. Token:', session.access_token.substring(0, 10) + '...')

    // 1. Try to read own profile
    console.log('👤 Reading User Profile...')
    const { data: profile, error: profError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

    if (profError) {
        console.error('❌ Profile read failed:', profError)
        return
    }

    console.log('✅ Profile read success:', profile.partner_id)

    // 2. Try to read partner
    if (profile?.partner_id) {
        console.log('🏢 Reading Partner...')
        const { data: partner, error: partError } = await supabase
            .from('partners')
            .select('*')
            .eq('id', profile.partner_id)
            .single()

        if (partError) {
            console.error('❌ Partner read failed:', partError)
        } else {
            console.log('✅ Partner read success:', partner.business_name)

            // 3. Try Insert Offer
            console.log('📝 Trying to Insert Offer...')
            const { data: offer, error: offerError } = await supabase.from('offers').insert({
                title: 'Verification Offer ' + Date.now(),
                description: 'Created by verify script',
                partner_id: partner.id,
                status: 'draft',
                category: 'Bien-être',
                subcategory: 'Massage',
                location: '10 Rue de Paris'
            }).select().single()

            if (offerError) console.error('❌ Offer INSERT failed:', offerError)
            else console.log('✅ Offer INSERT success:', offer.id)
        }
    }
}

verify()
