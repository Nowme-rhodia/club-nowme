
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
    const targetTitle = "Séjour en Thailande NOVEMBRE 2026";

    console.log(`Searching for "${targetTitle}"...`);

    const { data: offer, error } = await supabase
        .from('offers')
        .select(`
            id, 
            title, 
            slug, 
            is_official, 
            partner:partners!offers_partner_id_fkey(id, business_name, contact_email)
        `)
        .eq('title', targetTitle)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!offer) {
        console.error('Offer not found');
        return;
    }

    console.log('Offer Data:', JSON.stringify(offer, null, 2));

    const isOfficialComputed = offer.is_official === true ||
        offer.partner?.contact_email === 'rhodia@nowme.fr' ||
        offer.partner?.business_name === 'Nowme';

    console.log('Computed isOfficial:', isOfficialComputed);
}

main();
