import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing .env variables VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTable() {
    console.log('Checking for partner_notifications table...');
    // We try to select from the table. 
    // HEAD request is not directly supported by select() builder easily without retrieving data, 
    // but count with head:true is close.
    const { data, error, count } = await supabase
        .from('partner_notifications')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error accessing partner_notifications:', error);
        console.error('Error Code:', error.code);
        console.error('Error Details:', error.details);
        console.error('Error Message:', error.message);

        if (error.code === '42P01') { // undefined_table
            console.log('\nDIAGNOSIS: The table "partner_notifications" DOES NOT EXIST in the database.');
        } else if (error.message && error.message.includes('404')) {
            console.log('\nDIAGNOSIS: The table was not found (404). It likely does not exist.');
        }
    } else {
        console.log('Success! Table partner_notifications exists.');
        console.log(`Row count: ${count}`);
    }
}

checkTable()
