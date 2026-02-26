
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkStatuses() {
    const { data: offers, error } = await supabase
        .from('offers')
        .select('status');

    if (error) {
        console.error('Error fetching offers:', error);
        return;
    }

    const statuses = {};
    offers.forEach(o => {
        statuses[o.status] = (statuses[o.status] || 0) + 1;
    });

    console.log('Offer statuses found:', statuses);

    // Also check partners to see how they are linked
    const { data: oneOffer, error: err2 } = await supabase
        .from('offers')
        .select(`
            id,
            status,
            partner_id,
            partners (
                id,
                company_name,
                user_id,
                user_profiles (
                    email
                )
            )
        `)
        .limit(1);

    if (err2) {
        console.error('Error fetching partner info:', err2);
    } else {
        console.log('Sample offer with partner info:', JSON.stringify(oneOffer, null, 2));
    }
}

checkStatuses();
