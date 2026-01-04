
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRpc() {
    console.log(`Calling get_safe_community_locations...`);

    const { data, error } = await supabase.rpc('get_safe_community_locations');

    if (error) {
        console.error('RPC Error:', error);
        return;
    }

    console.log('RPC Data:', JSON.stringify(data, null, 2));
    console.log(`Count: ${data ? data.length : 0}`);
}

checkRpc();
