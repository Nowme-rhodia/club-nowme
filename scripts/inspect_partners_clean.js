
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPartners() {
    const { data: partners, error } = await supabase
        .from('partners')
        .select('id, company_name, description, avatar_url, cover_image_url, social_media_links')
        .not('company_name', 'is', null) // Filter out incomplete profiles
        .limit(5);

    if (error) {
        console.error('Error fetching partners:', error);
        return;
    }

    console.log(JSON.stringify(partners, null, 2));
}

inspectPartners();
