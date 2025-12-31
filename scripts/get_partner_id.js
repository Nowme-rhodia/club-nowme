
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
    const { data, error } = await supabase
        .from('partners')
        .select('id, business_name')
        .eq('status', 'approved')
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching partner:', error);
    } else {
        console.log(`Found Partner: ${data.business_name} (ID: ${data.id})`);
    }
}

run();
