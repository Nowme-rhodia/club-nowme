import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use SERVICE_ROLE_KEY to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials (SERVICE_ROLE_KEY needed)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOffer() {
    const offerId = '22f89587-ed11-40da-9d56-8e3b57df1281';
    console.log(`Checking offer ${offerId}...`);

    const updates = {
        slug: 'sejour-grece-2026',
        event_start_date: '2026-05-01T10:00:00.000Z',
        event_end_date: '2026-05-08T10:00:00.000Z',
        is_online: true
    };

    const { data: updated, error: updateError } = await supabase
        .from('offers')
        .update(updates)
        .eq('id', offerId)
        .select('id, title, slug, event_start_date, event_end_date')
        .single();

    if (updateError) {
        console.error('Error updating offer:', updateError);
    } else {
        console.log('Offer updated successfully:', updated);
    }
}

fixOffer();
