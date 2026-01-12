
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
    const url = `${supabaseUrl}/rest/v1/offer_categories?select=id,name,parent_name&name=ilike.*Gastr*`;
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
        console.log(`Found ${data.length} categories matching *Gastr*:`);
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

checkCategoriesRaw();
