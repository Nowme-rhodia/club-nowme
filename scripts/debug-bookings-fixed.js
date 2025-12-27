
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    const userId = '62b99bd7-b47c-4589-ba08-586085fbca8e';
    console.log(`--- Checking bookings with EMBEDDING for user ${userId} ---`);

    // Exact query from MyBookings.tsx
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          customer_email,
          source,
          external_id,
          offer:offers (
            id,
            title,
            image_url,
            city,
            promo_code,
            booking_type
          )
        `)
        .eq('user_id', userId)
        .order('booking_date', { ascending: false });

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        console.error('Message:', bookingsError.message);
        console.error('Hint:', bookingsError.hint);
    } else {
        console.log(`Found ${bookings.length} bookings.`);
        if (bookings.length > 0) {
            console.log('First booking offer:', bookings[0].offer);
        } else {
            console.log('No bookings found.');
        }
    }

    console.log('\n--- Checking RLS Policies on OFFERS ---');
    // We can't easily check policies without exec_sql if not service key, but we have service key.
    // However, listing policies via SQL requires exec_sql or direct connection.
    // Let's just try to fetch an offer with `supabase.auth.signInWithPassword` if we had a user... we don't.
    // But we know if the above query works (with service key), then schema is fine.
}

inspect();
