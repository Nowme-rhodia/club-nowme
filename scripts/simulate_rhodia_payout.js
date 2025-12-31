
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("🔍 Finding partner for rhodia@nowme.fr...");

    // 1. Get Partner ID
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('partner_id, email, id')
        .eq('email', 'rhodia@nowme.fr')
        .single();

    if (profileError || !profile) {
        console.error("❌ User rhodia@nowme.fr not found or has no partner_id", profileError);
        return;
    }

    const partnerId = profile.partner_id;
    console.log(`✅ Found Partner ID: ${partnerId}`);

    // 2. Insert Test Booking (Paid, Today)
    console.log("📝 Inserting test booking...");
    const today = new Date().toISOString();
    const bookingAmount = 150.00;

    // We need an offer ID too. Let's pick one from this partner.
    const { data: offers } = await supabase.from('offers').select('id').eq('partner_id', partnerId).limit(1);
    const offerId = offers && offers.length > 0 ? offers[0].id : null;

    const { data: existingBooking } = await supabase.from('bookings').select('user_id').limit(1).single();
    const userIdToUse = existingBooking ? existingBooking.user_id : profile.id;

    if (!offerId) {
        console.error("❌ No offers found for this partner to attach booking to.");
        return;
    }

    // ... insert using userIdToUse

    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
            partner_id: partnerId,
            user_id: userIdToUse,
            offer_id: offerId,
            amount: bookingAmount,
            status: 'paid'
        })
        .select()
        .single();

    if (bookingError) {
        console.error("❌ Failed. Msg:", bookingError.message);
        console.error("❌ Details:", bookingError.details);
        console.error("❌ Hint:", bookingError.hint);
        return;
    }
    console.log(`✅ Booking created: ${booking.id} (${booking.amount}€)`);

    // 3. Generate Payout Statement
    console.log("📄 Generating Payout Statement...");
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-payout-statement', {
        body: {
            partner_id: partnerId,
            period_start: startOfMonth,
            period_end: endOfMonth
        }
    });

    if (funcError) {
        console.error("❌ Function invocation failed:", funcError);
        return;
    }

    console.log("✅ Function Response:", JSON.stringify(funcData, null, 2));

    if (funcData.success) {
        console.log(`\n🎉 SUCCESS! Payout Record Created.`);
        console.log(`🔗 Statement URL: ${funcData.payout.statement_url}`);
        console.log(`📧 Check email for rhodia@nowme.fr to see the notification.`);
    } else {
        console.error("❌ Function returned error:", funcData.error);
    }

}

run();
