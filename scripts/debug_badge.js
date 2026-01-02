
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars from .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY; // Using Anon Key as regular users do

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOffers() {
    console.log("🔍 Checking offers and partner visibility...");

    const { data, error } = await supabase
        .from('offers')
        .select(`
            id,
            title,
            partner:partners(business_name, contact_email)
        `)
        .eq('status', 'approved')
        .eq('title', 'Teste à domicile');

    if (error) {
        console.error("Error fetching offers:", error);
        return;
    }

    if (data) {
        console.log(`Found ${data.length} offers.`);
        data.forEach(offer => {
            console.log(`\nOffer: ${offer.title}`);
            console.log(`Partner:`, offer.partner);
            if (offer.partner) {
                console.log(` - Business Name: '${offer.partner.business_name}'`);
                console.log(` - Email: '${offer.partner.contact_email}' (Type: ${typeof offer.partner.contact_email})`);

                const isOfficial = offer.partner.contact_email === 'rhodia@nowme.fr';
                console.log(` - Is Official (by email): ${isOfficial}`);
            }
        });
    }
}

checkOffers();
