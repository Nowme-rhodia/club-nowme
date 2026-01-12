
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function dumpCategories() {
    const { data, error } = await supabase
        .from('offer_categories')
        .select('name, parent_name')
        .order('name');

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

dumpCategories();
