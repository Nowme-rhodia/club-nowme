
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchRhodiaEvents() {
    // 1. Get Partner ID
    const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, business_name')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    if (partnerError) {
        console.error('Error finding partner:', partnerError);
        return;
    }

    if (!partnerData) {
        console.error('Partner rhodia@nowme.fr not found');
        return;
    }

    console.log('Found Partner:', partnerData.business_name, `(${partnerData.id})`);

    // 2. Fetch Offers/Events
    // Assuming 'offers' table has 'partner_id', 'title', 'price', 'description', etc.
    // Need to check specific columns for dates and member prices.
    // Based on previous inspections, likely 'commission_rate' or logic for member price exists?
    // Or 'price_with_commission'?
    // Let's select * to be sure and filter relevant ones.

    // We want "online events" -> maybe filtered by location or type?
    // The user said "tous les événements en ligne". 
    // I'll fetch everything for now and inspection.

    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false }); // or start_date if it exists

    if (offersError) {
        console.error('Error fetching offers:', offersError);
        return;
    }

    console.log(`Found ${offers.length} offers.`);

    if (offers.length > 0) {
        console.log(JSON.stringify(offers, null, 2));
    }
}

fetchRhodiaEvents();
