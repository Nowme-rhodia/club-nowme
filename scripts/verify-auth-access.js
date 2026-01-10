
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error("❌ Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
    // 1. Log in as a test user to get a token
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'nowme.club@gmail.com', // Using the email from the logs
        password: 'Trafalgar1,' // Assuming this is the password based on create-test-users.js
    });

    if (loginError) {
        console.error("❌ Login failed:", loginError);
        return;
    }

    console.log("✅ Logged in as:", session.user.email);

    // 2. Access member_rewards as authenticated user
    const { data, error } = await supabase
        .from('member_rewards')
        .select('*')
        .eq('user_id', session.user.id)
        .single(); // Should return 1 row or error

    if (error) {
        console.error("❌ Access Denied / Error:", error);
        console.log("Code:", error.code);
        console.log("Message:", error.message);
    } else {
        console.log("✅ Authenticated Access successful.");
        console.log("Data:", data);
    }
}

run();
