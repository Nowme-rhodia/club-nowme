import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetEmail = 'rhodia.partner@nowme.fr';

async function finalize() {
    console.log(`--- Finalizing Partner Status for: ${targetEmail} ---`);

    // Find partner
    const { data: partnerReq } = await supabase
        .from('partners')
        .select('id')
        .eq('contact_email', targetEmail) // We updated this in previous step
        .single();

    if (!partnerReq) {
        console.error('Partner not found with new email.');
        return;
    }

    // Update Status
    const { error } = await supabase
        .from('partners')
        .update({ status: 'approved' })
        .eq('id', partnerReq.id);

    if (error) console.error('Error:', error);
    else console.log('✅ Partner approved.');
}
finalize();
