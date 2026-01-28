
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log("Fetching latest booking...");
    const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (bookingError) {
        console.error("Error fetching bookings:", bookingError);
        return;
    }

    if (!bookings || bookings.length === 0) {
        console.log("No bookings found.");
        return;
    }

    console.log(`Found ${bookings.length} recent bookings.`);

    for (const booking of bookings) {
        console.log(`\nChecking Booking ID: ${booking.id}`);
        console.log(`- Created At: ${booking.created_at}`);
        console.log(`- Offer ID: ${booking.offer_id}`);
        console.log(`- Amount: ${booking.amount}`);

        if (!booking.offer_id) {
            console.error("  ❌ No offer_id on this booking!");
            continue;
        }

        const { data: offer, error: offerError } = await supabase
            .from('offers')
            .select('title, is_online, booking_type, external_link, digital_product_file')
            .eq('id', booking.offer_id)
            .single();

        if (offerError) {
            console.error("  ❌ Error fetching offer:", offerError);
        } else if (!offer) {
            console.error("  ❌ Offer not found (data is null)");
        } else {
            console.log(`  ✅ Offer found: "${offer.title}"`);
            console.log(`  - Booking Type: ${offer.booking_type}`);
        }
    }
}

diagnose();
