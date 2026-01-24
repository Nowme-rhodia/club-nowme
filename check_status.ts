
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
    const { data } = await supabase
        .from('offers')
        .select('is_approved, status')
        .ilike('title', '%Cercle de femmes%')
        .single();

    console.log('IS_APPROVED:', data?.is_approved);
    console.log('STATUS:', data?.status);
}

check();
