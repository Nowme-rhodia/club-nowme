import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findRhodia() {
    const { data, error } = await supabase
        .from('partners')
        .select('id, business_name, contact_email')
        .eq('contact_email', 'rhodia@nowme.fr')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Rhodia Partner:', data);
    }
}

findRhodia();
