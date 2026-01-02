
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Force Booking Test ---');

    // 1. Get Offer ID dynamically
    const { data: offers } = await supabase.from('offers').select('id, title').ilike('title', '%domicile%').limit(1).single();
    if (!offers) { console.error("Offer not found"); return; }
    const OFFER_ID = offers.id;
    console.log("Offer ID:", OFFER_ID);

    // 2. Get User ID
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === 'nowme.club@gmail.com');
    if (!user) { console.error("User not found"); return; }
    const userId = user.id;
    console.log("User ID:", userId);

    // 3. Call confirm_booking RPC (Simulate Stripe Webhook)
    const rpcParams = {
        p_user_id: userId,
        p_offer_id: OFFER_ID,
        p_booking_date: new Date().toISOString(),
        p_status: 'paid',
        p_source: 'stripe',
        p_amount: 100,
        p_variant_id: null,
        p_external_id: 'test_rpc_' + Date.now(),
        p_meeting_location: "123 RPC Test St, Backend City"
    };

    console.log("Calling confirm_booking RPC with:", rpcParams);

    const { data: result, error: rpcError } = await supabase.rpc('confirm_booking', rpcParams);

    if (rpcError) {
        console.error("RPC Error:", rpcError);
        return;
    }

    console.log("RPC Result:", result);
    // Result should look like { success: true, booking_id: ... }
    if (!result || !result.booking_id) {
        console.error("RPC returned no ID");
        return;
    }
    const bookingId = result.booking_id;

    // Verify Persisted Data
    const { data: bookingFetch } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    console.log("Fetched Verified Booking:", {
        id: bookingFetch.id,
        location: bookingFetch.meeting_location,
        status: bookingFetch.status
    });

    return; // Stop here for RPC test


    // 4. Simulate Webhook Update (Calendly Logic)
    // CRITICAL: We DO NOT send 'updated_at' here.
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 5);

    const updateData = {
        scheduled_at: scheduledDate.toISOString(),
        meeting_location: "REMOVED UPDATED_AT TEST (SUCCESS)",
        calendly_event_id: "test-final-" + Date.now()
    };

    const { data: updated, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id)
        .select()
        .single();

    if (updateError) {
        console.error("Update Error:", updateError);
    } else {
        console.log("Booking Updated SUCCESS:");
        console.log(" - ID:", updated.id);
        console.log(" - Scheduled At:", updated.scheduled_at);
        console.log(" - Location:", updated.meeting_location);
    }
}

run();
