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

async function simulate() {
    console.log('🚀 Starting Email Logic Simulation...')
    const bookingId = fs.readFileSync('last_booking_id.txt', 'utf-8').trim()
    console.log(`Booking ID: ${bookingId}`)

    try {
        // 1. Fetch Booking
        const { data: bookingData, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single()

        if (bookingError) throw new Error(`Booking Fetch Error: ${bookingError.message}`)
        console.log('✅ Booking Fetched')

        // 2. Fetch Related Data
        const [userResponse, offerResponse, partnerResponse, variantResponse] = await Promise.all([
            supabaseAdmin.from('user_profiles').select('first_name, last_name, email').eq('user_id', bookingData.user_id).single(),
            supabaseAdmin.from('offers').select('title, is_online, booking_type, external_link, digital_product_file').eq('id', bookingData.offer_id).single(),
            supabaseAdmin.from('partners').select('business_name, description, website, address, contact_email, notification_settings, siret, tva_intra').eq('id', bookingData.partner_id).single(),
            bookingData.variant_id ? supabaseAdmin.from('offer_variants').select('name, price, content').eq('id', bookingData.variant_id).single() : Promise.resolve({ data: null, error: null })
        ])

        if (userResponse.error) console.warn("⚠️ User fetch error:", userResponse.error)

        const user = userResponse.data || { first_name: 'Unknown', last_name: '', email: '' }
        const offer = offerResponse.data || { title: 'Offre inconnue' }
        const partner = partnerResponse.data || { business_name: 'Partenaire', contact_email: '' }
        const variant = variantResponse.data

        console.log(`✅ Related Data Fetched:`)
        console.log(`   User: ${user.email}`)
        console.log(`   Offer: ${offer.title}`)
        console.log(`   Partner: ${partner.business_name} (${partner.contact_email})`)

        if (!partner.contact_email) {
            console.error('❌ CRITICAL: Partner has no contact_email!')
            return
        }

        // 3. Check Settings
        const partnerSettings = partner.notification_settings || { new_booking: true }
        console.log(`   Settings: ${JSON.stringify(partnerSettings)}`)

        if (partnerSettings.new_booking === false) {
            console.error('❌ CRITICAL: Partner has disabled new_booking notifications!')
            return
        }

        console.log('✅ Settings OK - Should Send Email')

        // 4. Construct Content (Simplified check)
        const buyerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Client'
        const offerTitle = offer.title
        const fullItemName = `${offerTitle}${variant?.name ? ` - ${variant.name}` : ''}`
        const price = bookingData.amount || variant?.price || 0

        console.log(`   Email Recipient: ${partner.contact_email}`)
        console.log(`   Subject: Nouvelle réservation : ${buyerName} - ${offerTitle}`)
        console.log(`   Content Preview: ${fullItemName}, Price: ${price}`)

        // 5. Check Resend API Key
        const resendKey = process.env.RESEND_API_KEY
        if (!resendKey) {
            console.error('❌ RESEND_API_KEY is missing in .env')
        } else {
            console.log('✅ RESEND_API_KEY is present (starts with ' + resendKey.substring(0, 4) + ')')
        }

    } catch (e) {
        console.error('❌ SIMULATION FAILED:', e)
    }
}

simulate()
