
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log("Fixing ALL offers for 'rhodia@nowme.fr'...");

    // 1. Get Partner ID
    const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    if (!partner) {
        console.error('Partner not found');
        return;
    }

    // 2. Update all offers for this partner
    const { data: updated, error } = await supabase
        .from('offers')
        .update({ is_official: true })
        .eq('partner_id', partner.id)
        .select('id, title');

    if (error) {
        console.error('Error updating offers:', error);
    } else {
        console.log(`✅ Successfully updated ${updated.length} offers to be OFFICIAL.`);
        updated.forEach(o => console.log(`- ${o.title}`));
    }
}

main();
