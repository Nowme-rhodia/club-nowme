
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
    const targetTitle = "Séjour en Thailande NOVEMBRE 2026";

    console.log(`Updating "${targetTitle}" to be OFFICIAL...`);

    // 1. Find the offer
    const { data: offer, error: findError } = await supabase
        .from('offers')
        .select('id, title, is_official')
        .eq('title', targetTitle)
        .single();

    if (findError || !offer) {
        console.error('Error finding offer:', findError);
        return;
    }

    console.log('Current status:', offer.is_official);

    // 2. Update the offer
    const { data: updated, error: updateError } = await supabase
        .from('offers')
        .update({ is_official: true })
        .eq('id', offer.id)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating offer:', updateError);
    } else {
        console.log('Success! New status:', updated.is_official);
    }
}

main();
