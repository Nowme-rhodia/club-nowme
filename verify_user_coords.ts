
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Recovered Service Key
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU5MTU4MSwiZXhwIjoyMDU0MTY3NTgxfQ.WXPj9YGH5H-rCYGzcgAUS0LTZGe9waDkJpxhQTrsqjI';

if (!supabaseUrl) {
    console.error('Missing Supabase URL in .env');
    process.exit(1);
}

// Check other users too
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    const userId = '62b99bd7-b47c-4589-ba08-586085fbca8e';

    console.log(`Checking profile for user: ${userId}`);

    const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, latitude, longitude, delivery_address, photo_url')
        .eq('user_id', userId); // removed .single() to see array

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    console.log('Profile Data:', JSON.stringify(data, null, 2));

    if (data && data.length > 0) {
        const user = data[0];
        if (user.latitude && user.longitude) {
            console.log('✅ Coordinates are present!');
            console.log(`LAT: ${user.latitude}, LNG: ${user.longitude}`);
        } else {
            console.log('❌ Coordinates are MISSING (NULL).');
        }
    } else {
        console.log('❌ User record not found.');
    }

    // Also check count of users with valid coords
    const { count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

    console.log(`Total users with valid coordinates: ${count}`);
}

checkUser();
