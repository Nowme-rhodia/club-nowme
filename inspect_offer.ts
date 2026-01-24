
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectOffer() {
    const { data, error } = await supabase
        .from('offers')
        .select('id, title, status, is_approved, created_at, updated_at, event_end_date')
        .ilike('title', '%Cercle de femmes%');

    if (error) {
        console.error('Error fetching offer:', error);
        return;
    }

    console.log('--- OFFER DATA ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('--- END OFFER DATA ---');
}

inspectOffer();
