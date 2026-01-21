import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOffer() {
    const offerId = '22f89587-ed11-40da-9d56-8e3b57df1281';
    console.log(`Checking offer ${offerId}...`);

    const { data: offer, error } = await supabase
        .from('offers')
        .select('id, title, slug, event_start_date, event_end_date, is_online, status')
        .eq('id', offerId)
        .single();

    if (error) {
        console.error('Error fetching offer:', error);
        return;
    }

    console.log('Current State:', offer);

    const updates = {};
    let needsUpdate = false;

    // 1. Force Fix Slug
    const newSlug = 'sejour-grece-2026'; // Simplified
    if (offer.slug !== newSlug) {
        console.log(`Updating slug to: ${newSlug}`);
        updates.slug = newSlug;
        needsUpdate = true;
    }

    // 2. Fix Dates (May 2026)
    if (!offer.event_start_date || new Date(offer.event_start_date).getFullYear() !== 2026) {
        const newStartDate = '2026-05-01T10:00:00.000Z';
        console.log(`Updating start date to: ${newStartDate}`);
        updates.event_start_date = newStartDate;

        const newEndDate = '2026-05-08T10:00:00.000Z'; // 1 week later
        console.log(`Updating end date to: ${newEndDate}`);
        updates.event_end_date = newEndDate;

        needsUpdate = true;
    }

    if (needsUpdate) {
        const { data: updated, error: updateError } = await supabase
            .from('offers')
            .update(updates)
            .eq('id', offerId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating offer:', updateError);
        } else {
            console.log('Offer updated successfully:', updated);
        }
    } else {
        console.log('No updates needed based on current checks.');
    }
}

fixOffer();
