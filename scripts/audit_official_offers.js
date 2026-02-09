
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log("Auditing offers for 'rhodia@nowme.fr'...");

    // 1. Get Partner ID for rhodia@nowme.fr
    const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    if (partnerError || !partner) {
        console.error('Partner "rhodia@nowme.fr" not found!', partnerError);
        return;
    }

    console.log('Partner ID:', partner.id);

    // 2. Get all offers for this partner
    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, title, is_official, slug')
        .eq('partner_id', partner.id);

    if (offersError) {
        console.error('Error fetching offers:', offersError);
        return;
    }

    console.log(`Found ${offers.length} offers.`);

    const problematicOffers = offers.filter(o => !o.is_official);

    if (problematicOffers.length > 0) {
        console.log('\n⚠️ Found offers that explain "Official" intent but are NOT marked is_official:');
        problematicOffers.forEach(o => {
            console.log(`- [${o.id}] ${o.title} (slug: ${o.slug})`);
        });
        console.log(`\nTotal problematic: ${problematicOffers.length} / ${offers.length}`);
    } else {
        console.log("\n✅ All offers from this partner are correctly marked as 'is_official'.");
    }
}

main();
