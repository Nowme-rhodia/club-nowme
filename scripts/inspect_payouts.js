
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
    const { data: partner } = await supabase.from('partners').select('id').eq('contact_email', 'rhodia@nowme.fr').single();
    const { data: payouts } = await supabase.from('payouts').select('*').eq('partner_id', partner.id);

    const outFile = join(dirname(fileURLToPath(import.meta.url)), 'payouts_out.json');
    fs.writeFileSync(outFile, JSON.stringify(payouts, null, 2));
    console.log(`Written to ${outFile}`);
}
check();
