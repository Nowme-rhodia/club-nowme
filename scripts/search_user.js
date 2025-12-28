import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function searchUsers() {
    console.log(`--- Searching for users like 'rhodia' ---`);

    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('email, user_id')
        .ilike('email', '%rhodia%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found users:', users);
    }
}

searchUsers();
