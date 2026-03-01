import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkStockAlertQuery() {
    console.log("--- Checking send-low-stock-alert ---");
    const { data: variants, error } = await supabase
        .from("offer_variants")
        .select(`
            id,
            name,
            stock,
            offers!inner (
                title,
                status,
                partners!inner (
                    business_name,
                    contact_email,
                    contact_name
                )
            )
        `)
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (variants && variants.length > 0) {
        console.log("Variant offers type:", Array.isArray(variants[0].offers) ? "Array" : "Object");
        console.log("Variant partners type:", variants[0].offers && Array.isArray(variants[0].offers.partners) ? "Array" : "Object");
        console.log("Sample:", JSON.stringify(variants[0], null, 2));
    } else {
        console.log("No variants found.");
    }
}

async function checkFeedbackEmailQuery() {
    console.log("\n--- Checking send-feedback-email ---");
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            offers (
                id,
                title,
                booking_type,
                duration,
                event_end_date
            ),
            partners!inner (
               business_name
            )
        `)
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (bookings && bookings.length > 0) {
        console.log("Booking offers type:", Array.isArray(bookings[0].offers) ? "Array" : "Object");
        console.log("Booking partners type:", Array.isArray(bookings[0].partners) ? "Array" : "Object");
        console.log("Sample:", JSON.stringify(bookings[0], null, 2));
    } else {
        console.log("No confirmed bookings found.");
    }
}

async function run() {
    await checkStockAlertQuery();
    await checkFeedbackEmailQuery();
}

run();
