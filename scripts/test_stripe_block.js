
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRestrictedBlock() {
    console.log("Creating a TEST offer with restricted keyword 'Voyage en Iran'...");

    // 1. Create a dummy partner if needed, or use existing. Let's use the first one found.
    const { data: partners } = await supabase.from('partners').select('id').limit(1);
    const partnerId = partners[0].id;

    // 2. Insert dummy offer
    const { data: offer, error: insertError } = await supabase
        .from('offers')

        .insert({
            title: "TEST - Voyage découverte en Iran",
            description: "Un voyage magnifique en Perse.",
            // price: 100, // Removed as it likely doesn't exist on offers table
            partner_id: partnerId,
            status: 'draft',
            is_official: false,
            slug: `test-iran-${Date.now()}`
        })

        .select()
        .single();

    if (insertError) {
        console.error("Error creating test offer:", insertError);
        return;
    }

    console.log(`Created Test Offer: ${offer.title} (${offer.id})`);

    // 3. Call the Edge Function to simulate payment
    console.log("Attempting to create checkout session (should fail)...");

    // We need a valid user ID for the function, let's grab one
    const { data: users } = await supabase.from('user_profiles').select('user_id, email').limit(1);
    const user = users[0];

    const payload = {
        offer_id: offer.id,
        price: 100,
        user_id: user.user_id,
        user_email: user.email,
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        booking_type: 'event'
    };

    const { data: funcData, error: funcError } = await supabase.functions.invoke('create-checkout-session', {
        body: payload
    });

    // 4. Cleanup (Delete the test offer)
    console.log("Cleaning up test offer...");
    await supabase.from('offers').delete().eq('id', offer.id);

    // 5. Check Results
    if (funcError) {
        console.log("\n✅ SUCCESS: The function returned an error as expected!");
        console.log("Error details:", funcError);
    } else if (funcData && funcData.error) {
        console.log("\n✅ SUCCESS: The function returned a logical error:");
        console.log("Error message:", funcData.error);
        if (funcData.error.includes("Paiement refusé")) {
            console.log("Creating proof screenshot check: The error message MATCHES requirement.");
        }
    } else {
        console.error("\n❌ FAILURE: The function allowed the transaction!", funcData);
    }
}

testRestrictedBlock();
