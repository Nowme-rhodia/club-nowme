import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function inspect() {
    console.log("🔍 Inspecting data for 'rhodia@nowme.fr'...")

    // 1. Find Partner
    const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id, business_name, contact_email')
        .ilike('contact_email', 'rhodia@nowme.fr')

    if (partnerError) {
        console.error("Error finding partner:", partnerError)
        return
    }

    if (partners.length === 0) {
        console.log("❌ No partner found with email 'rhodia@nowme.fr'")
        return
    }

    const partner = partners[0]
    console.log(`✅ Found Partner: ${partner.business_name} (${partner.id})`)

    // 2. Find Offers
    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, title')
        .eq('partner_id', partner.id)

    if (offersError) {
        console.error("Error finding offers:", offersError)
        return
    }

    console.log(`found ${offers.length} offers.`)
    if (offers.length > 0) {
        console.log("Offers to delete:", offers.map(o => o.title))
    }

    // 3. Find Bookings
    if (offers.length > 0) {
        const offerIds = offers.map(o => o.id)
        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('id, user_id, status, offer_id')
            .in('offer_id', offerIds)

        if (bookingError) {
            console.error("Error finding bookings:", bookingError)
        } else {
            console.log(`found ${bookings.length} bookings to delete associated with these offers.`)
        }
    }
}

inspect()
