
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Adding payment columns to partners table...");

    const sql = `
    ALTER TABLE partners 
    ADD COLUMN IF NOT EXISTS payout_iban text,
    ADD COLUMN IF NOT EXISTS stripe_account_id text,
    ADD COLUMN IF NOT EXISTS calendly_url text;
  `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error adding columns:', error);
    } else {
        console.log('Success! Columns payout_iban, stripe_account_id, calendly_url added (if they were missing).');
    }
}

run();
