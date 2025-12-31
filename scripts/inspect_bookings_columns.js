
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("🔍 Inspecting bookings table...");

    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("✅ Columns found:", Object.keys(data[0]));
    } else {
        console.log("⚠️ No bookings found, cannot inspect columns from data.");
        // Try inserting a dummy with minimal fields if possible, or assume empty.
        // If empty, we can't see keys. 
        // But earlier I was told "bookings" exists.
    }
}

run();
