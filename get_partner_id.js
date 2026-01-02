
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getRhodiaId() {
    const { data, error } = await supabase
        .from('partners')
        .select('id, contact_email, business_name')
        .ilike('contact_email', '%rhodia%') // Try fuzzy search first
        .limit(5);

    if (error) console.error(error);
    else console.table(data);
}

getRhodiaId();
