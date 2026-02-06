
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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
    console.log('🔍 Inspecting Schema...');

    // Use a hack to list tables via information_schema or just rpc if available, 
    // but simpler: try to select from likely tables.

    // Actually, we can just try to query information_schema if we have permissions?
    // Usually Supabase exposes it? No, REST API limits access to user defined tables.

    // Let's try to just select * from subscriptions limit 1 and print full error if any.

    console.log("Checking 'subscriptions' table...");
    const { data, error } = await supabase.from('subscriptions').select('*').limit(1);

    if (error) {
        console.error("❌ Error selecting from 'subscriptions':", JSON.stringify(error, null, 2));
    } else {
        console.log("✅ Success selecting from 'subscriptions'. Data:", data);
    }

    // Check 'user_profiles'
    console.log("\nChecking 'user_profiles' table...");
    const { data: up, error: upError } = await supabase.from('user_profiles').select('*').limit(1);
    if (upError) {
        console.error("❌ Error selecting from 'user_profiles':", JSON.stringify(upError, null, 2));
    } else {
        console.log("✅ Success selecting from 'user_profiles'.");
    }

}

inspectSchema().catch(console.error);
