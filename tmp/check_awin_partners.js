
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPartners() {
    const list = [
        "Hairlust FR",
        "Maison des Fragrances",
        "Bonjour Drink",
        "French Mush",
        "La Couette Française",
        "Deesup",
        "Darty",
        "Fnac",
        "MonBento",
        "Sport Découverte",
        "ASMC"
    ];

    console.log("Checking Awin partners in database...");

    for (const name of list) {
        const { data, error } = await supabase
            .from('partners')
            .select('id, business_name, status')
            .ilike('business_name', `%${name}%`)
            .maybeSingle();

        if (error) {
            console.error(`Error checking ${name}:`, error.message);
        } else if (data) {
            console.log(`✅ Found: ${data.business_name} (ID: ${data.id}, Status: ${data.status})`);

            // Check if there are offers for this partner
            const { count, error: countError } = await supabase
                .from('offers')
                .select('*', { count: 'exact', head: true })
                .eq('partner_id', data.id);

            if (countError) {
                console.error(`  Error counting offers for ${name}:`, countError.message);
            } else {
                console.log(`  Offers: ${count}`);
            }
        } else {
            console.log(`❌ Not found: ${name}`);
        }
    }
}

checkPartners();
