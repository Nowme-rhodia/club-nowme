
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
    const { data } = await supabase.from('partners').select('*').eq('id', 'c78f1403-22b5-43e9-ac0d-00577701731b');
    console.log(data);
}
check();
