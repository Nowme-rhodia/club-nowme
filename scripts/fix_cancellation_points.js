
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function fixPoints() {
    const userId = '693b751f-6b94-4886-a65e-edf6fd1ef354';
    console.log(`Checking cancellations for user ${userId}...`);

    // 1. Get Cancelled Bookings
    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('id, amount, cancellation_reason, offers(title)')
        .eq('user_id', userId)
        .eq('status', 'cancelled');

    if (bError) {
        console.error("Error fetching bookings:", bError);
        return;
    }

    console.log(`Found ${bookings.length} cancelled bookings.`);

    for (const b of bookings) {
        // 2. Check if Refunded
        const isRefunded = b.cancellation_reason && b.cancellation_reason.includes('Refund: Yes');
        console.log(`Booking ${b.id}: Reason='${b.cancellation_reason}', Amount=${b.amount}, Refunded?=${isRefunded}`);

        if (!isRefunded) {
            console.log(`Skipping booking ${b.id} (Not refunded according to reason)`);
            continue;
        }

        if (!b.amount || b.amount <= 0) {
            console.log(`Skipping booking ${b.id} (Amount 0)`);
            continue;
        }

        // 3. Check for existing deduction
        // We look for history where metadata->booking_id == b.id AND amount < 0
        const { data: history } = await supabase
            .from('reward_history')
            .select('id')
            .eq('user_id', userId)
            .lt('amount', 0)
            .contains('metadata', { booking_id: b.id });

        if (history && history.length > 0) {
            console.log(`✅ Deduction already exists for booking ${b.id}`);
            continue;
        }

        // 4. Apply Deduction
        const points = Math.floor(b.amount);
        console.log(`🛠️ FIX: Deducting ${points} points for booking ${b.id} (${b.offers?.title})`);

        const { error: revError } = await supabase.rpc('award_points', {
            p_user_id: userId,
            p_amount: -points,
            p_reason: `Régularisation Annulation: ${b.offers?.title || 'Kiff'}`,
            p_metadata: { booking_id: b.id, refund: true, type: 'fix_script' }
        });

        if (revError) {
            console.error(`❌ Failed to deduct points for ${b.id}:`, revError.message);
        } else {
            console.log(`✅ Success.`);
        }
    }
}

fixPoints().catch(console.error)
