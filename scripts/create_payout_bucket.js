
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
    console.log("Creating 'payout_statements' storage bucket...");

    const { data, error } = await supabase.storage.createBucket('payout_statements', {
        public: false, // Partners only, secured by RLS ideally, or signed URLs
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['application/pdf']
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log("Bucket 'payout_statements' already exists.");
        } else {
            console.error('Error creating bucket:', error);
        }
    } else {
        console.log('Success! Bucket created.');
    }

    // Set RLS for bucket? Storage RLS is tricky via JS client usually done in SQL.
    // For now we rely on service role for writing, and signed URLs for reading (which bypass RLS if using createSignedUrl).
    // But to list them in dashboard, we might interpret "public: false" as needing Auth.
}

run();
