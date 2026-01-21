import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load .env manually since we can't easily use dotenv.config() in ES modules with relative paths smoothly sometimes without logic
// or just rely on process.env if already loaded? No, need to load it.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envConfig = dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.log('Env:', process.env); // Debug
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOffer() {
    const { data, error } = await supabase
        .from('offers')
        .select(`
      *,
      partner:partners(business_name, contact_email)
    `)
        .eq('id', '22f89587-ed11-40da-9d56-8e3b57df1281')
        .single();

    if (error) {
        console.error('Error fetching offer:', error);
    } else {
        fs.writeFileSync('offer_dump.json', JSON.stringify(data, null, 2));
        console.log('Written to offer_dump.json');
    }
}

checkOffer();
