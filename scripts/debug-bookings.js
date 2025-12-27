
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
    } else {
        console.log(`Found ${bookings.length} bookings.`);
        if (bookings.length > 0) console.log(bookings[0]);
    }

    console.log('\n--- Checking RLS Policies ---');
    const { data: policies, error: policyError } = await supabase
        .rpc('exec_sql', { sql_query: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'bookings';" });

    if (policyError) {
        // Fallback: try raw query if RPC fails (it likely will if exec_sql not there)
        console.log("RPC exec_sql failed or missing. Skipping policy check.");
    } else {
        console.log(policies);
    }
}

inspect();
```
