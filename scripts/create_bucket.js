import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Required environment variables (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
    console.log(`Connecting to Supabase: ${supabaseUrl}`);
    console.log("Attempting to create 'offer-attachments' bucket...");

    const { data, error } = await supabase
        .storage
        .createBucket('offer-attachments', {
            public: false,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed']
        });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log("✅ Bucket 'offer-attachments' already exists.");
        } else {
            console.error("❌ Error creating bucket:", error);
        }
    } else {
        console.log("✅ Bucket 'offer-attachments' created successfully:", data);
    }
}

createBucket();
