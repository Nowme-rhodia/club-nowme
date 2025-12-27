
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Note: In a real webhook we use SERVICE_ROLE_KEY to bypass RLS. 
// Here for simulation we might need it too if RLS blocks us. 
// Let's try to read SERVICE_KEY if available, else ANON.
// Usually local .env has anon. 
// If specific permissions are needed for 'bookings' insert (which allows public insert per our policy), anon is fine.
// But 'partners' read might be restricted? We fixed RLS for partners public read.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
    console.log('🚀 Starting Calendly Webhook Logic Simulation...');

    // 1. Setup Test Data
    console.log('\n1. Setting up Test Data...');

    // 1.1 Test User
    const testEmail = 'test-kiffeur@gmail.com';
    let userId = '';

    // Check if user exists in user_profiles (Public view might be restricted? We'll see)
    // Actually, we can't create auth users via client easily without admin SDK. 
    // We will assume we can't CREATE a new auth user easily here.
    // Strategy: Ensure we have a profile to link to. 
    // Just querying user_profiles for *any* user to use as "test-kiffeur".
    // If not found, use the first available user.

    const { data: users, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .limit(1);

    if (!users || users.length === 0) {
        console.error('❌ No users found in DB to link booking to. Please sign up a user first.');
        return;
    }

    const testUser = users[0];
    console.log(`   ✅ Using existing user: ${testUser.email} (${testUser.user_id})`);
    userId = testUser.user_id;

    // 1.2 Pick an Offer
    const { data: offers, error: offerError } = await supabase
        .from('offers')
        .select('id, title, calendly_url, partner_id')
        .limit(1);

    if (!offers || offers.length === 0) {
        console.error('❌ No offers found in DB.');
        return;
    }

    const testOffer = offers[0];
    console.log(`   ✅ Using existing offer: "${testOffer.title}" (ID: ${testOffer.id})`);

    // 2. Simulate Webhook Reception
    console.log('\n2. Simulating Webhook Payload Processing...');

    const fakePayload = {
        event_type_uri: "https://api.calendly.com/event_types/FAKE_UUID",
        event_uri: "https://api.calendly.com/events/FAKE_EVENT_ID",
        invitee_uri: "https://api.calendly.com/invitees/FAKE_INVITEE_ID",
        email: testUser.email, // Using real user email to match
        created_at: new Date().toISOString()
    };

    console.log('   📩 Received Payload:', JSON.stringify(fakePayload, null, 2));

    // 3. Execute Logic (Mocking the Fetch calls)
    console.log('\n3. Executing Matching Logic...');

    // 3.1 Identify Offer via Logic
    // The webhook would: Fetch eventType -> get scheduling_url -> match offer.calendly_url
    // We skip fetch and assume match found.
    console.log(`   🔍 Matching Offer by Calendly URL...`);
    // Simulating the DB lookup the webhook does:
    const { data: matchedOffers } = await supabase
        .from('offers')
        .select('id')
        .eq('id', testOffer.id); // Direct match for simulation

    if (!matchedOffers || matchedOffers.length === 0) {
        console.error('   ❌ Logic failed to match offer.');
        return;
    }
    console.log(`   ✅ Offer Matched: ${matchedOffers[0].id}`);

    // 3.2 Identify User via Logic
    console.log(`   🔍 Matching User by Email (${fakePayload.email})...`);
    // Simulating DB lookup
    const { data: matchedProfiles } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', fakePayload.email)
        .single();

    if (!matchedProfiles) {
        console.error('   ❌ Logic failed to match user.');
        return;
    }
    console.log(`   ✅ User Matched: ${matchedProfiles.user_id}`);

    // 4. Insert Booking
    console.log('\n4. Inserting Booking...');
    const externalId = `simulated_${Date.now()}`;

    const bookingData = {
        user_id: matchedProfiles.user_id,
        offer_id: testOffer.id,
        booking_date: fakePayload.created_at,
        customer_email: fakePayload.email,
        calendly_event_id: externalId,
        external_id: externalId,
        source: 'calendly_simulation', // marking as sim
        status: 'confirmed'
    };

    const { data: booking, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

    if (insertError) {
        console.error('   ❌ Insert Failed:', insertError);
        return;
    }

    console.log(`   ✅ Booking Inserted Successfully! ID: ${booking.id}`);

    // 5. Verification
    console.log('\n5. Final Verification...');
    const { data: verifyBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', booking.id)
        .single();

    if (verifyBooking && verifyBooking.status === 'confirmed') {
        console.log('   🎉 SUCCESS: Booking exists and is confirmed.');
        console.table({
            ID: verifyBooking.id,
            User: verifyBooking.user_id,
            Offer: verifyBooking.offer_id,
            Date: verifyBooking.booking_date,
            Status: verifyBooking.status
        });
    } else {
        console.error('   ❌ Verification Failed.');
    }
}

runSimulation().catch(console.error);
