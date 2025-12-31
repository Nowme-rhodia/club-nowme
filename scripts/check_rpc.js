
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoutine() {
    const { data, error } = await supabase
        .rpc('generate_monthly_partner_payouts');

    if (error) {
        console.log("RPC Call Result:", error);
    } else {
        console.log("RPC Call Success:", data);
    }
}

checkRoutine();
