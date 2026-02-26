
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPartnerEmails() {
    const list = [
        "Hairlust",
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

    console.log("Fetching contact emails for Awin partners...");

    const { data: partners, error } = await supabase
        .from('partners')
        .select('business_name, contact_email, contact_phone')
        .or(list.map(name => `business_name.ilike.%${name}%`).join(','));

    if (error) {
        console.error('Error fetching partners:', error.message);
        return;
    }

    partners.forEach(p => {
        console.log(`- ${p.business_name}: ${p.contact_email}`);
    });
}

checkPartnerEmails();
