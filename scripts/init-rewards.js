
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
    console.log("🛠️ Initializing member_rewards for all users without one...");

    // 1. Get all users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error(error);
        return;
    }

    let count = 0;
    for (const user of users) {
        // use award_points with 0 to init safely
        const { error: rpcError } = await supabase.rpc('award_points', {
            p_user_id: user.id,
            p_amount: 0,
            p_reason: 'Account Initialization',
            p_metadata: { init: true }
        });

        if (rpcError) console.error(`Failed for ${user.email}:`, rpcError);
        else count++;
    }
    console.log(`✅ Initialized ${count} users.`);
}

run();
