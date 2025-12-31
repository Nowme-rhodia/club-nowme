
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
    console.log("Checking 'payout_statements' bucket...");

    // 1. Check if exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) return console.error("Error listing buckets:", listError);

    const existing = buckets.find(b => b.name === 'payout_statements');

    if (existing) {
        console.log("Bucket exists. Public:", existing.public);
        if (!existing.public) {
            console.log("Updating to public...");
            const { error: updateError } = await supabase.storage.updateBucket('payout_statements', {
                public: true
            });
            if (updateError) console.error("Error updating bucket:", updateError);
            else console.log("Bucket updated to public.");
        }
    } else {
        console.log("Bucket does not exist. Creating public bucket...");
        const { data, error } = await supabase.storage.createBucket('payout_statements', {
            public: true,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ['application/pdf']
        });
        if (error) console.error("Error creating bucket:", error);
        else console.log("Success! Bucket created.");
    }
}

run();
