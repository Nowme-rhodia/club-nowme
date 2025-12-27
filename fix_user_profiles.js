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

async function fixProfiles() {
    console.log('🔄 Checking User Profiles...')

    // 1. Get our key test user
    const email = 'entreprisepartenaire@gmail.com'
    console.log(`🔎 Looking for auth user: ${email}`)

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
        console.error('❌ Failed to list users:', error)
        return
    }

    const user = users.find(u => u.email === email)
    if (!user) {
        console.error(`❌ User ${email} not found in Auth! Run create-test-users.js first?`)
        return
    }

    console.log(`✅ Auth user found: ${user.id}`)

    // 2. Check Profile
    const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (profile) {
        console.log(`✅ Profile found. Partner ID: ${profile.partner_id}`)
    } else {
        console.log('⚠️ Profile MISSING. Creating one...')
        const { error: insertError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: user.id,
                email: email,
                first_name: 'Partenaire',
                last_name: 'Test'
            })
        if (insertError) console.error('❌ Failed to create profile:', insertError)
        else console.log('✅ Profile created.')
    }

    // 3. Check Partner Link
    // If we have a profile but no partner_id, or we just created it
    const { data: currentProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (currentProfile && !currentProfile.partner_id) {
        console.log('⚠️ Partner ID missing in profile. Linking/Creating partner...')

        // Check if partner exists by email
        const { data: existingPartner } = await supabaseAdmin
            .from('partners')
            .select('*')
            .eq('contact_email', email)
            .maybeSingle()

        let partnerId = existingPartner?.id

        if (!partnerId) {
            console.log('   Creating new partner record...')
            const { data: newPartner, error: partnerError } = await supabaseAdmin
                .from('partners')
                .insert({
                    contact_email: email,
                    business_name: 'Entreprise Partenaire Test',
                    status: 'approved'
                })
                .select()
                .single()

            if (partnerError) {
                console.error('❌ Failed to create partner:', partnerError)
                return
            }
            partnerId = newPartner.id
        }

        // Update profile
        const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({ partner_id: partnerId })
            .eq('id', currentProfile.id)

        if (updateError) console.error('❌ Failed to link partner to profile:', updateError)
        else console.log(`✅ Linked Profile to Partner ${partnerId}`)
    } else {
        console.log('✅ Profile already has partner_id.')
    }

    console.log('🏁 Verification complete.')
}

fixProfiles()
