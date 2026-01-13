
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixStripeIds() {
    // Fetch users with potential JSON in stripe_customer_id
    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('user_id, stripe_customer_id')
        .not('stripe_customer_id', 'is', null)

    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    let count = 0;
    for (const user of users) {
        const rawId = user.stripe_customer_id;
        if (rawId && rawId.startsWith('{')) {
            try {
                console.log(`Fixing user ${user.user_id}...`);
                const parsed = JSON.parse(rawId);
                if (parsed.id && typeof parsed.id === 'string' && parsed.id.startsWith('cus_')) {
                    const { error: updateError } = await supabase
                        .from('user_profiles')
                        .update({ stripe_customer_id: parsed.id })
                        .eq('user_id', user.user_id);

                    if (updateError) console.error(`Failed to update user ${user.user_id}:`, updateError);
                    else {
                        console.log(`Updated user ${user.user_id} with ID ${parsed.id}`);
                        count++;
                    }
                }
            } catch (e) {
                console.error(`Failed to parse ID for user ${user.user_id}:`, e);
            }
        }
    }
    console.log(`Fixed ${count} users.`);
}

fixStripeIds()
