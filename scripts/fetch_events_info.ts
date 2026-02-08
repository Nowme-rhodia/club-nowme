
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'https://deno.land/std@0.192.0/dotenv/load.ts';

const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- CLUB EVENTS ---');
    const { data: events, error: eventsError } = await supabase
        .from('club_events')
        .select('id, title, date_time, location')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true });

    if (eventsError) console.error('Error fetching events:', eventsError);
    else console.table(events);

    console.log('\n--- OFFERS (Active) ---');
    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, title, location')
        .limit(10); // Just a sample to check if any match

    if (offersError) console.error('Error fetching offers:', offersError);
    else console.table(offers);
}

main();
