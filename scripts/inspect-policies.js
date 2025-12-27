
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    console.log('--- RLS Policies ---');
    const { data: policies, error: policyError } = await supabase
        .rpc('exec_sql', {
            sql_query: `
            SELECT tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename IN ('bookings', 'offers')
            ORDER BY tablename;
        `});

    if (policyError) {
        console.error("RPC Error:", policyError);
    } else {
        console.table(policies);
    }
}

inspect();
