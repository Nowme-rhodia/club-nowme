
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyRpc() {
    console.log("Verifying confirm_booking RPC logic...");

    // 1. Create a dummy PENDING booking (simulate Calendly)
    // We need a real user/offer/variant IDs. Let's use hardcoded ones from user logs or fetch valid ones.
    // User: 693b751f-6b94-4886-a65e-edf6fd1ef354 (from Logs)
    // Offer: 3e4a5840-bae4-49ff-b68d-03402fd72810
    // Variant: d2f8538e-aed9-4582-9687-c0c5ebbfeb71

    const userId = "693b751f-6b94-4886-a65e-edf6fd1ef354";
    const offerId = "3e4a5840-bae4-49ff-b68d-03402fd72810";
    const variantId = "d2f8538e-aed9-4582-9687-c0c5ebbfeb71";

    // Clean up any existing pending booking for this test
    await supabase.from("bookings").delete().match({ user_id: userId, offer_id: offerId, status: 'pending' });

    // Insert 'old' pending booking with WRONG ADDRESS
    const { data: insertData, error: insertError } = await supabase.from("bookings").insert({
        user_id: userId,
        offer_id: offerId,
        variant_id: variantId,
        status: 'pending',
        booking_date: new Date().toISOString(),
        meeting_location: "OLD WRONG ADDRESS",
        source: 'calendly'
    }).select().single();

    if (insertError) {
        console.error("Setup failed (insert):", insertError);
        return;
    }
    console.log("Setup: Created pending booking with 'OLD WRONG ADDRESS':", insertData.id);

    // 2. Call confirm_booking with NEW ADDRESS
    console.log("Calling confirm_booking with 'NEW CORRECT ADDRESS'...");
    const { data: rpcData, error: rpcError } = await supabase.rpc('confirm_booking', {
        p_user_id: userId,
        p_offer_id: offerId,
        p_booking_date: new Date().toISOString(),
        p_status: 'confirmed',
        p_source: 'stripe',
        p_amount: 10,
        p_variant_id: variantId,
        p_external_id: 'test_verify_rpc',
        p_meeting_location: "NEW CORRECT ADDRESS"
    });

    if (rpcError) {
        console.error("RPC Call Failed:", rpcError);
        return;
    }
    console.log("RPC Success:", rpcData);

    // 3. Verify the booking was updated
    const { data: verifyData, error: verifyError } = await supabase
        .from("bookings")
        .select("meeting_location, status")
        .eq("id", insertData.id)
        .single();

    if (verifyError) {
        console.error("Verification fetch failed:", verifyError);
        return;
    }

    console.log("VERIFICATION RESULT:");
    console.log("Expected: NEW CORRECT ADDRESS");
    console.log("Actual:  ", verifyData.meeting_location);

    if (verifyData.meeting_location === "NEW CORRECT ADDRESS") {
        console.log("✅ SUCCESS: RPC handles address update correctly!");
    } else {
        console.log("❌ FAILURE: RPC ignored the new address.");
    }
}

verifyRpc();
