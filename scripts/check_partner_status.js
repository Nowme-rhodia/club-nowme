
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPartner() {
    console.log("Searching for partner 'Brice Caumont'...");

    const { data, error } = await supabase
        .from('partners')
        .select('*')
        .ilike('contact_name', '%Brice Caumont%') // Try contact name first

    if (error) {
        console.error("Error searching partner:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} partner(s):`);
        data.forEach(p => {
            console.log("---");
            console.log(`ID: ${p.id}`);
            console.log(`Business Name: ${p.business_name}`);
            console.log(`Contact Name: ${p.contact_name}`);
            console.log(`Email: ${p.contact_email}`);
            console.log(`SIRET: ${p.siret}`);
            console.log(`Status: ${p.status}`);
            console.log(`Signed At: ${p.signed_at || 'Not signed'}`);
            console.log(`Signature: ${p.signature ? 'Present' : 'Missing'}`);
            console.log("---");
        });
    } else {
        // Try searching by business name if contact name fails
        console.log("No match by contact_name. Trying business_name...");
        const { data: dataBiz, error: errorBiz } = await supabase
            .from('partners')
            .select('*')
            .ilike('business_name', '%Brice%');

        if (dataBiz && dataBiz.length > 0) {
            console.log(`Found ${dataBiz.length} partner(s) by business name:`);
            dataBiz.forEach(p => {
                console.log("---");
                console.log(`ID: ${p.id}`);
                console.log(`Business Name: ${p.business_name}`);
                console.log(`Contact Name: ${p.contact_name}`);
                console.log("---");
            });
        } else {
            console.log("No partner found.");
        }
    }
}

findPartner();
