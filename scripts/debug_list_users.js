import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllUsers() {
    console.log('--- Listing All Users ---');
    let allUsers = [];
    let page = 1;

    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
        if (error) {
            console.error(error);
            break;
        }
        if (!users || users.length === 0) break;

        allUsers = [...allUsers, ...users];
        page++;
    }

    console.log(`Total Users: ${allUsers.length}`);

    // Find our target
    const target = 'rhodia@nowme.fr';
    const found = allUsers.find(u => u.email?.toLowerCase() === target.toLowerCase());

    if (found) {
        console.log('✅ Found Target User:', {
            id: found.id,
            email: found.email,
            confirmed_at: found.confirmed_at,
            last_sign_in: found.last_sign_in_at
        });
    } else {
        console.log('❌ Target User NOT FOUND in list.');
        // Print similar emails?
        allUsers.forEach(u => {
            if (u.email.includes('rhodia') || u.email.includes('nowme')) {
                console.log(' - Similar match:', u.email, u.id);
            }
        });
    }
}

listAllUsers();
