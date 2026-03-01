const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const brands = ['Bonjour Drink', 'Darty', 'ASMC', 'Hairlust', 'French Mush', 'La Couette Française', 'Fnac', 'monbento', 'Maison des Fragrances', 'Dee Sup', 'Sport Découverte'];

    // Fetch all duplicates for these brands
    const { data: partners, error } = await supabase
        .from('partners')
        .select('id, business_name, user_id')
        .in('business_name', brands);

    if (error) {
        console.error("Error fetching partners:", error.message);
        return;
    }

    const placeholders = partners.filter(p => p.user_id === null || !p.user_id);
    const validProfiles = partners.filter(p => p.user_id !== null);

    console.log(`Found ${placeholders.length} placeholder profiles (user_id = null)`);
    console.log(`Found ${validProfiles.length} active profiles (user_id != null)`);

    // Check if any placeholder has offers
    for (const p of placeholders) {
        const { data: offers } = await supabase
            .from('offers')
            .select('id')
            .eq('partner_id', p.id);

        if (offers && offers.length > 0) {
            console.log(`⚠️ Placeholder ${p.business_name} (${p.id}) has ${offers.length} offers! Safely moving offers to active profile...`);
            // Find active profile
            const active = validProfiles.find(v => v.business_name === p.business_name);
            if (active) {
                const { error: updateErr } = await supabase
                    .from('offers')
                    .update({ partner_id: active.id })
                    .eq('partner_id', p.id);
                if (updateErr) console.error("Error moving offers:", updateErr);
                else console.log(`Moved offers to ${active.id}`);
            }
        }
    }

    // Now delete placeholders
    if (placeholders.length > 0) {
        const idsToDelete = placeholders.map(p => p.id);
        const { error: deleteErr } = await supabase
            .from('partners')
            .delete()
            .in('id', idsToDelete);

        if (deleteErr) console.error("Error deleting placeholders:", deleteErr.message);
        else console.log(`✅ Deleted ${idsToDelete.length} duplicate placeholders.`);
    }
}

main();
