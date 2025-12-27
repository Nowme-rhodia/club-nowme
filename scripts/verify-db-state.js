
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
    console.log('Verifying commission_rate column...');

    // Check specific partner
    const { data, error } = await supabase
        .from('partners')
        .select('id, business_name, commission_rate')
        .eq('id', 'c78f1403-22b5-43e9-ac0d-00577701731b')
        .single();

    if (error) {
        console.error('Error fetching partner:', error);
    } else {
        console.log('Partner found:', data);
        if (data.commission_rate === 20) {
            console.log('SUCCESS: Commission rate is 20');
        } else {
            console.log(`FAILURE: Commission rate is ${data.commission_rate}, expected 20`);
        }
    }
}

verify();
