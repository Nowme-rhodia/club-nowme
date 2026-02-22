import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRecentSignups() {
    console.log('--- Checking Recent Signups (Since Feb 18) ---');
    const startDate = new Date('2026-02-18T00:00:00Z');

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const recentUsers = users.filter(u => new Date(u.created_at) > startDate);

    console.log(`Found ${recentUsers.length} users created since Feb 18.`);

    for (const user of recentUsers) {
        // Check profile
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        console.log(`- ${user.email} (${user.id})`);
        console.log(`  Created: ${user.created_at}`);
        if (profile) {
            console.log(`  Profile Found! ID: ${profile.id}`);
            console.log(`  Role: ${profile.role}`);
            console.log(`  First Name: ${profile.first_name || 'Empty'}`);
            console.log(`  Phone: ${profile.phone || 'Empty'}`);
        } else {
            console.log(`  ❌ NO PROFILE FOUND in user_profiles table.`);
            if (profileError) console.log(`  Error: ${profileError.message}`);
        }
    }
}

checkRecentSignups();
