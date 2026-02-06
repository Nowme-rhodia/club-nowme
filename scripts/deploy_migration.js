
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sqlFilePath = path.join(process.cwd(), 'supabase/migrations/20260206120000_sync_subscription_trigger.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

async function deployMigration() {
    console.log("🚀 Deploying migration via 'exec_sql' RPC...");

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error("❌ Migration Failed:", JSON.stringify(error, null, 2));
    } else {
        console.log("✅ Migration Success!");
        console.log(data);
    }
}

deployMigration().catch(console.error);
