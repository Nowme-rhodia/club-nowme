
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
    console.log("🔄 Reloading PostgREST Schema Cache...");

    // Command to reload PostgREST schema cache
    const sql = "NOTIFY pgrst, 'reload config';";

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error("❌ Error reloading schema:", error);
    } else {
        console.log("✅ Schema cache reloaded successfully.");
    }
}

run();
