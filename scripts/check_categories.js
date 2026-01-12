
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function checkCategories() {
    const { data, error } = await adminClient
        .from('offer_categories')
        .select('id, name, parent_name');

    if (error) {
        console.error(error);
        return;
    }

    const mainCats = data.filter(c => !c.parent_name);
    console.log(`Total categories: ${data.length}`);
    console.log(`Main categories (parent_name is null/empty): ${mainCats.length}`);

    if (mainCats.length === 0) {
        console.log('Sample categories:', data.slice(0, 5));
    } else {
        console.log('Sample main categories:', mainCats.slice(0, 3));
    }
}

checkCategories();
