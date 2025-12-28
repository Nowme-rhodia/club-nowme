import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('Error: VITE_SUPABASE_URL is missing in .env');
    process.exit(1);
}

const userId = 'c59a458f-1c35-4faf-98d8-109d63a64bba';

async function checkUser() {
    console.log('--- Checking User Data for:', userId, '---');

    // 1. Check with Service Role Key (Bypass RLS)
    if (supabaseServiceKey) {
        console.log('\n[Checking with Service Role Key - Bypassing RLS]');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (profileError) console.error('Profile Error:', profileError);
        else console.log('Profile Data:', profile);

        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (subError) console.error('Subscription Error:', subError);
        else console.log('Subscription Data:', subscription);

    } else {
        console.warn('\n[Warning] SUPABASE_SERVICE_ROLE_KEY not found. Skipping admin check.');
    }

    // 2. Check with Anon Key (Respecting RLS) - simulating client
    if (supabaseAnonKey) {
        console.log('\n[Checking with Anon Key - Simulating Public Access]');
        const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

        // Note: This won't work perfectly as we are not logged in as the user, 
        // so RLS will likely block access unless tables are public. 
        // But it's good to see if tables are accidentally public or if there's a weird policy.

        // Attempting to select as anon user
        const { data: profile, error: profileError } = await supabaseAnon
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (profileError) console.log('Profile Access (Anon):', profileError.message); // Expected to fail or return null usually
        else console.log('Profile Data (Anon):', profile);

        const { data: subscription, error: subError } = await supabaseAnon
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (subError) console.log('Subscription Access (Anon):', subError.message);
        else console.log('Subscription Data (Anon):', subscription);

    } else {
        console.warn('\n[Warning] VITE_SUPABASE_ANON_KEY not found.');
    }
}

checkUser();
