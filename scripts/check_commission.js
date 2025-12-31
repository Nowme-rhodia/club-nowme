
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("--- Checking Partners Structure ---");
    const { data: partners, error: pError } = await supabase.from('partners').select('*').limit(1);
    if (pError) console.error("Partners Error:", pError);
    else console.log("Partners Keys:", JSON.stringify(Object.keys(partners?.[0] || {}), null, 2));

    console.log("--- Checking Profiles Structure ---");
    const { data: profiles, error: uError } = await supabase.from('user_profiles').select('*').limit(1);
    if (uError) console.error("Profiles Error:", uError);
    else console.log("Profiles Keys:", JSON.stringify(Object.keys(profiles?.[0] || {}), null, 2));
}

run();
