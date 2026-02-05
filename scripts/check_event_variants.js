
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVariants() {
    // Find the event first to get its ID
    const { data: events, error } = await supabase
        .from('offers')
        .select('id, title')
        .ilike('title', '%Veux-tu%')
        .limit(1);

    if (error || !events || events.length === 0) {
        console.error('Event not found');
        return;
    }

    const eventId = events[0].id;
    console.log(`Event Found: ${events[0].title} (ID: ${eventId})`);

    // Fetch variants
    const { data: variants, error: varError } = await supabase
        .from('offer_variants')
        .select('name, price, discounted_price, description')
        .eq('offer_id', eventId);

    if (varError) {
        console.error('Error fetching variants:', varError);
        return;
    }

    console.log(JSON.stringify(variants, null, 2));
}

checkVariants();
