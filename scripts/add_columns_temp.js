import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPA') || k.includes('VITE') || k.includes('KEY')));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars: URL=' + !!supabaseUrl + ', KEY=' + !!supabaseServiceKey);
    // process.exit(1); 
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const sql = `
    ALTER TABLE public.micro_squads
    ADD COLUMN IF NOT EXISTS reminder_7d_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_3d_sent_at TIMESTAMPTZ;
  `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('Error executing SQL:', error);
    } else {
        console.log('Columns added successfully.');
    }
}

run();
