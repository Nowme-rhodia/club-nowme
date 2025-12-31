import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables. Please ensure .env exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
    console.log('🔍 Checking `partners` table schema...');

    // Try to select the specific new column
    const { data, error } = await supabase
        .from('partners')
        .select('stripe_account_id')
        .limit(1);

    if (error) {
        if (error.code === '42703') { // Undefined column
            console.error('❌ Migration MISSING: The column `stripe_account_id` does not exist in the `partners` table.');
            console.log('\n👉 PLEASE RUN THIS SQL IN YOUR SUPABASE DASHBOARD:\n');
            console.log(`
      ALTER TABLE partners 
      ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;
      
      CREATE INDEX IF NOT EXISTS idx_partners_stripe_account_id ON partners(stripe_account_id);
      `);
        } else {
            console.error('❌ Error checking schema:', error.message);
        }
    } else {
        console.log('✅ Migration VERIFIED: `stripe_account_id` column exists!');
        console.log('   You can proceed to deploy the Edge Function.');
    }
}

verifyMigration();
