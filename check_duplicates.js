import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const { data, error } = await supabase
        .from('offers')
        .select('id, title, slug')
        .eq('slug', 'nowme-en-ligne');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Offers with slug 'nowme-en-ligne': ${data.length}`);
        console.log(JSON.stringify(data, null, 2));
    }
}

checkDuplicates();
