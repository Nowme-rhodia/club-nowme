const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkContent() {
    const lastTuesday = new Date("2026-02-24T06:30:00Z");
    const oneWeekBeforeTuesday = new Date(lastTuesday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekBeforeTuesdayStr = oneWeekBeforeTuesday.toISOString();
    const lastTuesdayStr = lastTuesday.toISOString();

    console.log(`Checking content created between ${oneWeekBeforeTuesdayStr} and ${lastTuesdayStr}`);

    const { count: officialOffers } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gt('created_at', oneWeekBeforeTuesdayStr)
        .lt('created_at', lastTuesdayStr)
        .eq('is_official', true || false); // The function checks is_official on partners table though

    // Let's re-read the function's official content logic
    // Step 0: Identify Official Partners
    // const { data: officialPartners } = await supabase.from("partners").select("id").eq("is_official", true);
    // A. Fetch Official Offers: .in("partner_id", officialPartnerIds)
    // B. Fetch Regular New Offers: .not("partner_id", "in", `(${officialPartnerIds.join(',')})`)

    const { data: officialPartners } = await supabase.from("partners").select("id").eq("is_official", true);
    const officialPartnerIds = officialPartners?.map(p => p.id) || [];

    let officialCount = 0;
    if (officialPartnerIds.length > 0) {
        const { count } = await supabase
            .from("offers")
            .select("*", { count: 'exact', head: true })
            .eq("status", "approved")
            .gt("created_at", oneWeekBeforeTuesdayStr)
            .lt("created_at", lastTuesdayStr)
            .in("partner_id", officialPartnerIds);
        officialCount = count || 0;
    }

    const { count: regularCount } = await supabase
        .from("offers")
        .select("*", { count: 'exact', head: true })
        .eq("status", "approved")
        .gt("created_at", oneWeekBeforeTuesdayStr)
        .lt("created_at", lastTuesdayStr)
        .not("partner_id", "in", `(${officialPartnerIds.join(',')})`);

    const { count: partnersCount } = await supabase
        .from("partners")
        .select("*", { count: 'exact', head: true })
        .eq("status", "approved")
        .gt("created_at", oneWeekBeforeTuesdayStr)
        .lt("created_at", lastTuesdayStr);

    console.log(`Official Offers: ${officialCount}`);
    console.log(`Regular Offers: ${regularCount}`);
    console.log(`New Partners: ${partnersCount}`);

    const shouldRun = officialCount > 0 || regularCount > 0 || partnersCount > 0;
    console.log(`Should recap have run? ${shouldRun}`);
}

checkContent();
