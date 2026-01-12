
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

async function checkCategoriesRaw() {
    const url = `${supabaseUrl}/rest/v1/offer_categories?select=id,name,parent_name&order=name.asc`;
    console.log(`Fetching from: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log(`Fetched ${data.length} categories.`);
        console.log('Sample raw JSON:', JSON.stringify(data.slice(0, 5), null, 2));

        const mainCats = data.filter(c => !c.parent_name);
        console.log(`Main categories ( !parent_name ): ${mainCats.length}`);
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

checkCategoriesRaw();
