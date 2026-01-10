import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TARGET_EMAIL = 'entreprisepartenaire@gmail.com'

async function deletePartnerData() {
    console.log(`🔥 Starting deletion for '${TARGET_EMAIL}'...`)

    // 1. Find Partner
    const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id, business_name')
        .ilike('contact_email', TARGET_EMAIL)

    if (partners.length === 0) {
        console.log("❌ Partner not found.")
        return
    }
    const partner = partners[0]
    console.log(`✅ Found Partner: ${partner.business_name} (${partner.id})`)

    // 2. Find Offers
    const { data: offers } = await supabase
        .from('offers')
        .select('id')
        .eq('partner_id', partner.id)

    if (!offers || offers.length === 0) {
        console.log("✅ No offers to delete.")
        return
    }

    const offerIds = offers.map(o => o.id)
    console.log(`Found ${offerIds.length} offers to delete.`)

    // 3. Delete Bookings FIRST (Foreign Key Constraint)
    const { error: deleteBookingsError, count: bookingsCount } = await supabase
        .from('bookings')
        .delete({ count: 'exact' })
        .in('offer_id', offerIds)

    if (deleteBookingsError) {
        console.error("❌ Error deleting bookings:", deleteBookingsError)
        return
    }
    console.log(`✅ Deleted ${bookingsCount} bookings.`)

    // 4. Delete Offer Variants
    const { error: deleteVariantsError, count: variantsCount } = await supabase
        .from('offer_variants')
        .delete({ count: 'exact' })
        .in('offer_id', offerIds)

    if (deleteVariantsError) {
        console.log("ℹ️ Variants deletion result (might be cascaded):", deleteVariantsError.message)
    } else {
        console.log(`✅ Deleted ${variantsCount} variants.`)
    }

    // 5. Delete Offers
    const { error: deleteOffersError, count: offersCount } = await supabase
        .from('offers')
        .delete({ count: 'exact' })
        .in('id', offerIds)

    if (deleteOffersError) {
        console.error("❌ Error deleting offers:", deleteOffersError)
    } else {
        console.log(`✅ Deleted ${offersCount} offers.`)
    }
}

deletePartnerData()
