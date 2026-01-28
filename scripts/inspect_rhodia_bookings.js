
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectBookings() {
    const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id, contact_email')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    if (partnerError) {
        console.error('Error finding partner:', partnerError);
        return;
    }

    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
      id,
      created_at,
      amount,
      status,
      is_payout_eligible,
      user_id,
      offers ( title )
    `)
        .eq('partner_id', partner.id);

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
    }

    const results = [];
    for (const b of bookings) {
        const { data: userProfile } = await supabase.from('user_profiles').select('first_name, last_name, email').eq('user_id', b.user_id).single();

        const clientName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''} (${userProfile.email})` : 'Unknown User';
        const offerTitle = b.offers?.title || 'Unknown Offer';

        results.push({
            id: b.id,
            created_at: b.created_at,
            offer: offerTitle,
            client: clientName,
            amount: b.amount,
            status: b.status,
            is_payout_eligible: b.is_payout_eligible
        });
    }
    const outFile = join(dirname(fileURLToPath(import.meta.url)), 'bookings_out.json');
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Written to ${outFile}`);
}

inspectBookings();
