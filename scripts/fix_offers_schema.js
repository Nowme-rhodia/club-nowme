
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars from root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const sql = `
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS cancellation_conditions TEXT DEFAULT 'Strict (Non remboursable)';
  `;

    console.log('Applying offers schema change...');

    // Try using RPC exec_sql which should exist from previous setup tools
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error applying fix:', error);
        process.exit(1);
    } else {
        console.log('Success! Column cancellation_conditions added to offers.');
    }
}

run();
