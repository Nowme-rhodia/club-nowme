
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Applying Payouts Table Migration...");

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251231060000_create_payouts_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Basic cleaning of comments that might break RPC if not handled well by simple split? 
    // Actually supabase exec_sql usually handles it fine.

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error creating payouts table:', error);
    } else {
        console.log('Success! Table payouts created and RLS applied.');
    }
}

run();
