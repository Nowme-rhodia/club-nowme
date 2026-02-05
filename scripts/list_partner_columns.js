
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

async function listColumns() {
    const { data: partners, error } = await supabase
        .from('partners')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching partners:', error);
        return;
    }

    if (partners && partners.length > 0) {
        console.log('Columns:', Object.keys(partners[0]));
    } else {
        console.log('No partners found to inspect columns.');
    }
}

listColumns();
