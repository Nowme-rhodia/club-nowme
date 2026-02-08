
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const targetTitle = "Séjour en Thailande NOVEMBRE 2026";
    const newSlug = "sejour-thailande-novembre-2026";

    console.log(`Updating slug for "${targetTitle}" to "${newSlug}"...`);

    // First, find the offer to confirm ID
    const { data: offers, error: findError } = await supabase
        .from('offers')
        .select('id, title, slug')
        .eq('title', targetTitle)
        .single();

    if (findError) {
        console.error('Error finding offer:', findError.message);
        return;
    }

    if (!offers) {
        console.error('Offer not found!');
        return;
    }

    console.log('Found offer:', offers);

    // Update the slug
    const { data: updated, error: updateError } = await supabase
        .from('offers')
        .update({ slug: newSlug })
        .eq('id', offers.id)
        .select();

    if (updateError) {
        console.error('Error updating slug:', updateError.message);
    } else {
        console.log('Success! Updated offer:', updated);
    }
}

main();
