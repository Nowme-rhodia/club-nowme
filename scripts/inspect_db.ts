
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- LATEST CALENDLY EVENTS ---');
    const { data: events, error: eventError } = await supabase
        .from('calendly_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (eventError) console.error(eventError);
    else {
        events.forEach(e => {
            console.log(`\nID: ${e.id} | Status: ${e.status} | Created: ${e.created_at}`);
            console.log(`Error: ${e.error_log}`);
            // Log deep payload parts
            const payload = e.payload?.payload || {};
            console.log(`Tracking:`, JSON.stringify(payload.tracking, null, 2));
            console.log(`Resource Start Time:`, e.payload?.resource?.start_time);
            console.log(`Payload Start Time:`, payload.scheduled_event?.start_time);
            console.log(`Invitee Email:`, payload.email);
            console.log(`Invitee Name:`, payload.name);
        });
    }

    console.log('\n--- LATEST BOOKINGS ---');
    const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, user_id, offer_id, status, scheduled_at, booking_date, calendly_event_id')
        .order('created_at', { ascending: false })
        .limit(3);

    if (bookingError) console.error(bookingError);
    else console.table(bookings);
}

inspect();
