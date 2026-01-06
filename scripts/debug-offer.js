
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestOffer() {
    console.log('Fetching latest offer...');

    const { data: offers, error } = await supabase
        .from('offers')
        .select('id, title, event_start_date, installment_options, created_at, offer_variants(price)')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching offer:', error);
        return;
    }

    if (offers && offers.length > 0) {
        const offer = offers[0];
        console.log('Latest Offer:', JSON.stringify(offer, null, 2));

        // Check 7-day rule
        if (offer.event_start_date) {
            const start = new Date(offer.event_start_date).getTime();
            const now = Date.now();
            const diffDays = (start - now) / (1000 * 60 * 60 * 24);
            console.log(`Event starts in ${diffDays.toFixed(2)} days.`);

            if (diffDays <= 7) {
                console.log('WARNING: Less than 7 days. Installments will NOT be shown.');
            } else {
                console.log('Date is eligible (> 7 days).');
            }
        } else {
            console.log('No event start date (eligible by default).');
        }

    } else {
        console.log('No offers found.');
    }
}

checkLatestOffer();
