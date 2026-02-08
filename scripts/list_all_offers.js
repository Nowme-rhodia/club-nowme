
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- ALL OFFERS TO FILE ---');
    const { data: offers, error } = await supabase
        .from('offers')
        .select('id, title, slug')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error.message);
    } else {
        fs.writeFileSync('offers_list.json', JSON.stringify(offers, null, 2));
        console.log('Wrote offers to offers_list.json');
    }
}

main();
