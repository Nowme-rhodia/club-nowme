
import { createClient } from "npm:@supabase/supabase-js@2";
import "jsr:@std/dotenv/load";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectBookings() {
    console.log("Fetching bookings...");
    const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, created_at, status, amount, cancelled_by_partner, cancellation_reason, penalty_amount, cancelled_at")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching bookings:", error);
        return;
    }

    console.log(`Found ${bookings.length} bookings.`);

    const cancelled = bookings.filter(b => b.status === 'cancelled');
    console.log(`Found ${cancelled.length} cancelled bookings.`);

    cancelled.forEach(b => {
        console.log("------------------------------------------------");
        console.log(`Booking ID: ${b.id}`);
        console.log(`Status: ${b.status}`);
        console.log(`Amount: ${b.amount}`);
        console.log(`Cancelled By Partner: ${b.cancelled_by_partner} (Type: ${typeof b.cancelled_by_partner})`);
        console.log(`Cancellation Reason: ${b.cancellation_reason}`);
        console.log(`Penalty Amount: ${b.penalty_amount}`);
        console.log(`Cancelled At: ${b.cancelled_at}`);
    });
}

inspectBookings();
