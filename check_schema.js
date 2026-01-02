import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
    const { data, error } = await supabase.from('offer_categories').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Keys:', Object.keys(data[0]));
        console.log('Sample:', data[0]);
    } else {
        console.log('No data found, cannot infer schema, or error:', error);
    }
}

checkSchema()
