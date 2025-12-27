import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

const supabasePublic = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
)

async function seed() {
    const email = 'entreprisepartenaire@gmail.com'
    const password = 'MvPbSa2Fblb2'

    console.log(`🔑 Logging in/Creating user ${email}...`)

    // Try Login
    let userId;
    const { data: loginData, error: loginError } = await supabasePublic.auth.signInWithPassword({ email, password })

    if (loginData?.user) {
        userId = loginData.user.id
        console.log(`✅ Logged in: ${userId}`)
    } else {
        console.log('⚠️ Login failed, trying create...')
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })
        if (createError) {
            console.error('❌ Creation failed:', createError)
            return
        }
        userId = createData.user.id
        console.log(`✅ Created user: ${userId}`)
    }

    // Force Delete Profile
    console.log('🧹 Deleting existing profiles for this email...')
    const { error: delError } = await supabaseAdmin.from('user_profiles').delete().eq('email', email)
    if (delError) console.error('⚠️ Delete error:', delError)

    // Ensure Partner (Manual Logic)
    console.log('🏢 Upserting Partner...')

    let partnerId;
    const { data: existingP } = await supabaseAdmin.from('partners').select('id').eq('contact_email', email).maybeSingle()

    if (existingP) {
        partnerId = existingP.id
        console.log(`   Found existing partner: ${partnerId}`)
        await supabaseAdmin.from('partners').update({
            business_name: 'Entreprise Partenaire Seeded',
            status: 'approved'
        }).eq('id', partnerId)
    } else {
        const { data: newP, error: mkError } = await supabaseAdmin.from('partners').insert({
            contact_email: email,
            business_name: 'Entreprise Partenaire Seeded',
            status: 'approved',
            commission_rate: 0.2
        }).select().single()

        if (mkError) { console.error('❌ Partner create failed:', mkError); return }
        partnerId = newP.id
        console.log(`   Created new partner: ${partnerId}`)
    }

    console.log(`✅ Partner ready: ${partnerId}`)

    // Insert Profile
    console.log('👤 Inserting Profile...')
    const { error: insError } = await supabaseAdmin.from('user_profiles').insert({
        user_id: userId,
        email: email,
        partner_id: partnerId,
        first_name: 'Partenaire',
        last_name: 'Seeded'
    })

    if (insError) console.error('❌ Profile insert failed:', insError)
    else console.log('✅ SEED SUCCESSFUL')
}

seed()
