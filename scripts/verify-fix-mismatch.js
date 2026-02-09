
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runTest() {
    console.log('🚀 Starting Email Mismatch Verification Test...');

    const testEmail = `match-test-${Date.now()}@nowme.fr`;
    const stripeEmail = `different-${Date.now()}@gmail.com`; // DIFFERENT EMAIL
    let userId = null;
    let offerId = null;

    try {
        // 1. Create a temporary Test User
        console.log(`1️⃣ Creating test user: ${testEmail}`);
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: testEmail,
            email_confirm: true,
            user_metadata: { first_name: 'Test', last_name: 'Mismatch' }
        });

        if (authError) throw authError;
        userId = authUser.user.id;
        console.log(`   ✅ User created: ${userId}`);

        // Manually create profile to satisfy FK constraint
        const { error: profileError } = await supabase.from('user_profiles').insert({
            user_id: userId,
            email: testEmail,
            first_name: 'Test',
            last_name: 'Mismatch'
            // role: 'member' // Removed as it causes error
        });
        if (profileError) {
            console.log("   ⚠️ Profile insert failed (maybe auto-created?):", profileError.message);
        } else {
            console.log("   ✅ Profile manually inserted.");
        }

        // 2. Get a real Offer ID for context (or create strict mock if needed, but fetching one is easier)
        const { data: offer } = await supabase.from('offers').select('id, partner_id').limit(1).single();
        if (!offer) throw new Error("No offers found in DB to test with.");
        offerId = offer.id;
        console.log(`   ✅ Using Offer ID: ${offerId}`);

        // 3. Construct Mismatch Webhook Event
        const mockEvent = {
            id: `evt_verif_${Date.now()}`,
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: `cs_verif_${Date.now()}`,
                    object: 'checkout.session',
                    amount_total: 1000,
                    currency: 'eur',
                    payment_status: 'paid',
                    status: 'complete',
                    customer_details: {
                        email: stripeEmail, // <--- MISMATCH HERE
                        name: 'Stripe Payer'
                    },
                    customer_email: stripeEmail, // <--- AND HERE
                    metadata: {
                        source: 'club-nowme',
                        user_id: userId,        // <--- TRUSTED ID
                        offer_id: offerId,
                        booking_type: 'event', // Force event to trigger simple booking logic
                        meeting_location: 'Test Location'
                    }
                }
            }
        };

        // 4. Send to Webhook
        console.log('2️⃣ Sending Webhook with Email Mismatch...');
        console.log(`   Internal Email: ${testEmail}`);
        console.log(`   Stripe Email:   ${stripeEmail}`);

        const webhookUrl = `${SUPABASE_URL}/functions/v1/stripe-webhook`;
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockEvent)
        });

        const text = await response.text();
        console.log(`   Response Status: ${response.status}`);
        console.log(`   Response Body: ${text}`);

        let jsonResponse;
        try { jsonResponse = JSON.parse(text); } catch (e) { }

        if (response.ok && !jsonResponse?.error) {
            console.log('   ✅ Webhook returned 200 OK and no error.');
        } else {
            console.error('   ❌ Webhook Failed (Error in response)');
            console.error(`   Error details: ${jsonResponse?.error || text}`);
            // throw new Error(`Webhook failed`);
        }

        // 5. Verify Booking Creation
        console.log('3️⃣ Verifying Booking Creation in DB...');
        // Give a moment for async processing if needed (though webhook usually waits for RPC)
        await new Promise(r => setTimeout(r, 5000));

        // Check if profile exists
        const { data: profile } = await supabase.from('user_profiles').select('id').eq('user_id', userId).single();
        if (!profile) console.error("   ⚠️ WARNING: User Profile missing! Trigger might have failed.");
        else console.log("   ✅ User Profile exists.");

        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('id, status, user_id')
            .eq('user_id', userId)
            .eq('offer_id', offerId)
            .maybeSingle();

        if (bookingError) {
            console.error('   ❌ Booking Check Error:', bookingError);
        } else if (!booking) {
            console.error('   ❌ Booking NOT found in DB.');
            console.log('   (This means the webhook finished but did not insert the booking)');
        } else {
            console.log(`   ✅ Booking confirmed! ID: ${booking.id}`);
            console.log('   🎉 SUCCESS: Emails didn\'t match, but booking was created.');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        // Cleanup
        if (userId) {
            console.log('🧹 Cleaning up test user...');
            await supabase.auth.admin.deleteUser(userId);
            console.log('   User deleted.');
        }
    }
}

runTest();
