
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260110114000_remove_calendly_url.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: Remove calendly_url...');

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error applying migration:', error);
    } else {
        console.log('Migration applied successfully.');
    }
}

applyMigration();
