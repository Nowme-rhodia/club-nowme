
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const keywords = ['Apéro', 'épouser', 'Karaok', 'Girlz', 'Thaïlande', 'Thailande', 'Thai'];
    let found = [];

    console.log('Searching offers...');

    for (const k of keywords) {
        const { data, error } = await supabase
            .from('offers')
            .select('id, title, slug')
            .ilike('title', `%${k}%`);

        if (error) {
            console.error(`Error searching for ${k}:`, error.message);
        } else {
            if (data && data.length > 0) {
                console.log(`Found match for "${k}":`, data);
                found.push(...data);
            } else {
                console.log(`No match for "${k}"`);
            }
        }
    }
}

main();
