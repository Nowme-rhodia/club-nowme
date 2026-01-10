
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const MIGRATIONS = [
    '20260109_create_loyalty_system.sql',
    '20260109_loyalty_credits.sql',
    '20260109_squad_rewards.sql'
];

async function run() {
    console.log("🚀 Starting migrations via RPC...");

    for (const migrationFile of MIGRATIONS) {
        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
        if (!fs.existsSync(sqlPath)) {
            console.error(`⚠️ Migration file not found: ${sqlPath} (Skipping)`);
            continue;
        }

        console.log(`📜 Executing migration: ${migrationFile}...`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute via RPC
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error(`❌ Failed to apply ${migrationFile}:`, error);
            // We exit or continue? Let's stop on error basically.
            process.exit(1);
        }

        console.log(`✅ Success: ${migrationFile}`);
    }

    console.log("🏁 All migrations applied via exec_sql.");
}

run();
