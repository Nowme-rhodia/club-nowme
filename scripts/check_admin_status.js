import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Required environment variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdmin() {
    console.log('Checking admin status for rhodia@nowme.fr...');

    // 1. Get User ID from Auth
    // Note: Service role cannot list users easily without listUsers API which is admin-only.
    // But we can query user_profiles if we know the email?
    // user_profiles usually has email.

    const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('email', 'rhodia@nowme.fr');

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profile found for rhodia@nowme.fr');
        return;
    }

    const profile = profiles[0];
    console.log('Found profile:', {
        id: profile.id,
        email: profile.email,
        is_admin: profile.is_admin,
        role: profile.role // Just in case
    });

    if (profile.is_admin !== true) {
        console.log('User is NOT admin. Attempting to fix...');
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ is_admin: true })
            .eq('id', profile.id);

        if (updateError) {
            console.error('Error updating admin status:', updateError);
        } else {
            console.log('✅ Successfully updated user to is_admin=true');
        }
    } else {
        console.log('✅ User is already marked as admin.');
    }
}

checkAdmin();
