
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
    console.log("Invoking generate-payout-statement...");

    const { data, error } = await supabase.functions.invoke('generate-payout-statement', {
        body: {
            partner_id: 'c78f1403-22b5-43e9-ac0d-00577701731b',
            period_start: '2025-12-01',
            period_end: '2025-12-31'
        }
    });

    if (error) {
        console.error('Function Error:', error);
    } else {
        console.log('Function Success:', data);
        if (data.payout && data.payout.statement_url) {
            console.log("PDF generated at:", data.payout.statement_url);
        }
    }
}

run();
