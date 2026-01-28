
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBookings() {
    console.log("Starting cleanup for Rhodia...");

    // 1. Get Partner
    const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    if (partnerError) {
        console.error("Partner not found:", partnerError);
        return;
    }
    const partnerId = partner.id;
    console.log(`Partner ID: ${partnerId}`);

    // 2. Define the Real Booking ID (Arielle Be)
    const realBookingId = '1f6670ee-0884-426f-8fcb-fdda58f4f228';

    // 3. Get all bookings for this partner
    const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, is_payout_eligible, amount')
        .eq('partner_id', partnerId);

    console.log(`Found ${bookings.length} bookings.`);

    for (const b of bookings) {
        if (b.id === realBookingId) {
            console.log(`[PRESERVE] Booking ${b.id} (Amount: ${b.amount}). Ensure confirmed & eligible.`);
            // Ensure it is confirmed and eligible
            await supabase
                .from('bookings')
                .update({ status: 'confirmed', is_payout_eligible: true })
                .eq('id', b.id);
        } else {
            console.log(`[CANCEL] Booking ${b.id} (Amount: ${b.amount}). Marking cancelled & ineligible.`);
            // Cancel and mark ineligible
            await supabase
                .from('bookings')
                .update({ status: 'cancelled', is_payout_eligible: false })
                .eq('id', b.id);
        }
    }

    console.log("Cleanup complete.");
}

fixBookings();
