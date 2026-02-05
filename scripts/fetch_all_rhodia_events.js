
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllRhodiaEvents() {
    const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, business_name')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    if (partnerError || !partnerData) {
        console.error('Partner not found');
        return;
    }

    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select(`
            id,
            title,
            description,
            event_start_date,
            event_end_date,
            is_online,
            slug,
            city,
            street_address,
            offer_variants (
                name,
                price,
                discounted_price
            )
        `)
        .eq('partner_id', partnerData.id)
        .gte('event_start_date', new Date().toISOString())
        .order('event_start_date', { ascending: true });

    if (offersError) {
        console.error('Error fetching offers:', offersError);
        return;
    }

    const cleanOffers = offers.map(o => {
        const variant = o.offer_variants && o.offer_variants.length > 0 ? o.offer_variants[0] : null;

        return {
            title: o.title,
            date: o.event_start_date,
            is_online: o.is_online,
            city: o.city,
            street_address: o.street_address,
            description: o.description ? o.description.substring(0, 100) + '...' : '',
            public_price: variant ? variant.price : null,
            member_price: variant ? (variant.discounted_price) : null,
            variant_name: variant ? variant.name : ''
        };
    });

    fs.writeFileSync('all_events_rhodia.json', JSON.stringify(cleanOffers, null, 2));
    console.log(`Written ${cleanOffers.length} events to all_events_rhodia.json`);
}

fetchAllRhodiaEvents();
