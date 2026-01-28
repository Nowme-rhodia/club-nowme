
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
    const results = [];

    // 1. Find bookings by Customer 'nowme.club@gmail.com'
    const { data: user } = await supabase.from('user_profiles').select('user_id').eq('email', 'nowme.club@gmail.com').single();
    if (user) {
        console.log(`Found Customer: nowme.club@gmail.com (${user.user_id})`);
        const { data: customerBookings } = await supabase
            .from('bookings')
            .select(`id, created_at, amount, status, is_payout_eligible, partner_id, offers(title)`)
            .eq('user_id', user.user_id);

        if (customerBookings) {
            for (const b of customerBookings) {
                results.push({ ...b, source: 'By Customer Email' });
            }
        }
    }

    // 2. Find bookings for any partner with email like '%rhodia%'
    const { data: partners } = await supabase.from('partners').select('id, contact_email').ilike('contact_email', '%rhodia%');
    if (partners) {
        for (const p of partners) {
            console.log(`Checking Partner: ${p.contact_email} (${p.id})`);
            const { data: partnerBookings } = await supabase
                .from('bookings')
                .select(`id, created_at, amount, status, is_payout_eligible, partner_id, offers(title)`)
                .eq('partner_id', p.id);

            if (partnerBookings) {
                for (const b of partnerBookings) {
                    // Avoid duplicates
                    if (!results.find(r => r.id === b.id)) {
                        results.push({ ...b, source: `By Partner ${p.contact_email}` });
                    }
                }
            }
        }
    }

    const outFile = join(dirname(fileURLToPath(import.meta.url)), 'bookings_out_broad.json');
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Written to ${outFile}`);
}

inspectBookings();
