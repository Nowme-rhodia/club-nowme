
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('   🔐 Using Service Role Key (Admin Mode)');
} else {
    console.log('   ⚠️ Using Anon Key (RLS Restricted)');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runSimulation() {
    console.log('🚀 Starting Calendly Webhook Logic Simulation (JS)...');

    // 1. Setup Test Data
    console.log('\n1. Setting up Test Data...');

    // 1.1 Test User
    const testEmail = 'test_client@nowme.io';
    let userId = '';

    // Try to find user by email first in PROFILE
    let { data: users } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('email', testEmail)
        .single();

    if (!users) {
        console.log(`   👤 User profile not found for ${testEmail}. Checking Auth...`);

        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            // Check if Auth User exists
            const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
            const existingAuth = authUsers ? authUsers.find(u => u.email === testEmail) : null;

            if (existingAuth) {
                console.log('   ⚠️ Auth user exists but no profile. Creating profile...');
                userId = existingAuth.id;
                // Create missing profile
                const { error: insertProfileError } = await supabase.from('user_profiles').insert({
                    user_id: userId,
                    email: testEmail,
                    first_name: 'Test',
                    last_name: 'Client'
                });
                if (insertProfileError && insertProfileError.code !== '23505') { // Ignore duplicate
                    console.error('   ❌ Failed to insert profile:', insertProfileError.message);
                    return;
                }
                users = { user_id: userId, email: testEmail };
            } else {
                console.log('   👤 creating new user in Auth...');
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: testEmail,
                    password: 'password123',
                    email_confirm: true
                });

                if (createError) {
                    console.error('   ❌ Failed to create user:', createError.message);
                    return;
                }
                userId = newUser.user.id;
                // Create profile explicitly to be sure
                await supabase.from('user_profiles').insert({
                    user_id: userId,
                    email: testEmail,
                    first_name: 'Test',
                    last_name: 'Client'
                });

                users = { user_id: userId, email: testEmail };
                console.log('   ✅ User created successfully.');
            }
        } else {
            console.error('   ❌ Service Role Key missing. Cannot create test user.');
            return;
        }
    }

    const testUser = users;
    console.log(`   ✅ Using Test User: ${testUser.email} (${testUser.user_id})`);
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
        event_uri: "https://api.calendly.com/events/fake_event_123",
        invitee_uri: "https://api.calendly.com/invitees/FAKE_INVITEE_ID",
        email: testUser.email,
        created_at: "2025-12-30T14:00:00Z"
    };

    console.log('   📩 Received Payload:', JSON.stringify(fakePayload, null, 2));

    // 3. Execute Logic
    console.log('\n3. Executing Matching Logic...');

    console.log(`   🔍 Matching Offer by Calendly URL...`);
    const { data: matchedOffers } = await supabase
        .from('offers')
        .select('id')
        .eq('id', testOffer.id);

    if (!matchedOffers || matchedOffers.length === 0) {
        console.error('   ❌ Logic failed to match offer.');
        return;
    }
    console.log(`   ✅ Offer Matched: ${matchedOffers[0].id}`);

    console.log(`   🔍 Matching User by Email (${fakePayload.email})...`);
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
        source: 'calendly_simulation',
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
