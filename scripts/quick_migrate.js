
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const sql = `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;`;
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) console.error(error);
    else console.log("Migration applied: stripe_transfer_id added.");
}
run();
