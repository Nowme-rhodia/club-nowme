
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Fetching Offer ---');
    const { data: offers, error: offerError } = await supabase
        .from('offers')
        .select('id, title')
        .ilike('title', '%domicile%');

    if (offerError) console.error('Offer Error:', offerError);
    else console.log('Offers found:', offers);

    console.log('\n--- Fetching User ---');
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) console.error('User Error:', userError);
    else {
        // Trying to find nowme.club@gmail.com
        const user = users.find(u => u.email === 'nowme.club@gmail.com');
        // If found, log it. If not, log first user as backup.
        if (user) {
            console.log('User found:', { id: user.id, email: user.email });
        } else {
            console.log('Target user not found. Providing backup user from list:', users.length > 0 ? { id: users[0].id, email: users[0].email } : 'No users found');
        }
    }
}

run();
