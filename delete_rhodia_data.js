import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function deleteRhodiaData() {
    console.log("🔥 Starting deletion for 'rhodia@nowme.fr'...")

    // 1. Find Partner
    const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .ilike('contact_email', 'rhodia@nowme.fr')

    if (partners.length === 0) {
        console.log("❌ Partner not found.")
        return
    }
    const partnerId = partners[0].id

    // 2. Find Offers
    const { data: offers } = await supabase
        .from('offers')
        .select('id')
        .eq('partner_id', partnerId)

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

    // 4. Delete Offer Variants (if any separate table, depending on schema, usually they cascade or are part of offers logic, but let's check if 'offer_variants' exists and needs manual cleanup or if it cascades usually)
    // Assuming cascade or we delete them explicitly if they exist.
    // Let's check schema/previous interactions: 'offer_variants' table usually exists.
    const { error: deleteVariantsError, count: variantsCount } = await supabase
        .from('offer_variants')
        .delete({ count: 'exact' })
        .in('offer_id', offerIds)

    if (deleteVariantsError) {
        // It might cascade, so ignore if it's already done
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

deleteRhodiaData()
