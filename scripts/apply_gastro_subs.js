
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function apply() {
    console.log("Reading SQL file...");
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260112_add_gastro_subcategories.sql');
    try {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Executing SQL via RPC...");

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error("❌ SQL execution failed:", error);
        } else {
            console.log("✅ SQL executed successfully (Subcategories Added)!");
        }
    } catch (err) {
        console.error("Failed to read file or execute:", err);
    }
}

apply();
