import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkColumn() {
    const { data, error } = await supabase.from('offers').select('image_url').limit(1);
    if (error) {
        console.log('Error selecting image_url:', error.message);
    } else {
        console.log('Column image_url exists!');
    }
}

checkColumn()
