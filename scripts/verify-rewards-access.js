
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use ANON key to simulate frontend access
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error("❌ Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
    console.log("🕵️ Verifying access to member_rewards using ANON key...");

    // Try to select count to check visibility (requires GRANT SELECT)
    // Note: RLS might return 0 rows if not authenticated, but 406 means "I don't even know this table exists for you"
    const { count, error } = await supabase
        .from('member_rewards')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Access Denied / Error:", error);
        if (error.code === '42P01') console.log("👉 Table not found (42P01)");
        if (error.code === 'PGRST301') console.log("👉 Table not accessible (PGRST301)");
        // 406 is an HTTP status, supabase-js might map it or show detailed message or throw.
    } else {
        console.log("✅ Access successful. Table is visible.");
    }
}

run();
