
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectBookings() {
    console.log('Fetching latest 10 bookings...');
    const { data, error } = await supabase
        .from('bookings')
        .select(`
      id,
      created_at,
      user_id,
      status,
      scheduled_at,
      booking_date,
      offer_id,
      offer:offers (
        title,
        booking_type,
        event_start_date
      ) // removed user_profiles join to avoid RLS/FK issues if simplified model
    `)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

inspectBookings();
