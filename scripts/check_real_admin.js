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
    console.log('Checking admin status for admin@admin.fr...');

    const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('email', 'admin@admin.fr');

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profile found for admin@admin.fr');
        return;
    }

    const profile = profiles[0];
    console.log('Found profile:', {
        id: profile.id,
        email: profile.email,
        is_admin: profile.is_admin
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
