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

async function checkPrice() {
    const offerId = '22f89587-ed11-40da-9d56-8e3b57df1281';
    console.log(`Checking price for offer ${offerId}...`);

    const { data, error } = await supabase
        .from('offers')
        .select(`
      id, 
      title, 
      offer_variants(id, price, discounted_price)
    `)
        .eq('id', offerId)
        .single();

    if (error) {
        console.error('Error fetching offer:', error);
    } else {
        console.log('Offer Price Data:', JSON.stringify(data, null, 2));
    }
}

checkPrice();
