
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUser() {
    // Assuming the user is likely one of the recent ones or 'Sophie'
    const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, stripe_customer_id')
        .ilike('first_name', '%Sophie%')
        .limit(5)

    if (error) console.error(error)
    else {
        data.forEach(u => {
            console.log('STRIPE_ID:' + (u.stripe_customer_id || 'MISSING'));
        });
    }
}

checkUser()
