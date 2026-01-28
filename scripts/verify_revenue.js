
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRevenue() {
    const { data: partner } = await supabase.from('partners').select('id').eq('contact_email', 'rhodia@nowme.fr').single();

    const { data: bookings } = await supabase
        .from('bookings')
        .select('amount, status, is_payout_eligible')
        .eq('partner_id', partner.id)
        .gte('created_at', '2026-01-01') // January 2026
        .in('status', ['confirmed', 'completed']);

    const total = bookings.reduce((sum, b) => sum + b.amount, 0);
    console.log(`Live Confirmed Revenue for Jan 2026: ${total} €`);
    console.log('Bookings contributing:', bookings);
}

checkRevenue();
