import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Required environment variables (URL or SERVICE_ROLE_KEY) are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const targetEmail = 'rhodia@nowme.fr';

async function grantPartner() {
    console.log(`--- Granting Partner Access to ${targetEmail} ---`);

    // 1. Get User ID
    const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', targetEmail)
        .single();

    if (userError || !userData) {
        console.error('❌ Error finding user:', userError);
        if (userError?.code === 'PGRST116') {
            console.error('User not found. Please ensure the user has signed up first.');
        }
        return;
    }

    const userId = userData.user_id;
    console.log(`✅ Found User ID: ${userId}`);

    // 2. Check/Create Partner Record
    let partnerId;

    const { data: existingPartner, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (existingPartner) {
        partnerId = existingPartner.id;
        console.log(`✅ Existing Partner Record Found: ${partnerId}`);

        // Ensure active
        await supabase.from('partners').update({ status: 'active' }).eq('id', partnerId);
    } else {
        console.log('Creating new partner record...');
        const { data: newPartner, error: createError } = await supabase
            .from('partners')
            .insert({
                user_id: userId,
                status: 'active',
                company_name: 'NowMe Internal',
                slug: 'nowme-internal-' + Math.floor(Math.random() * 1000)
            })
            .select('id')
            .single();

        if (createError) {
            console.error('❌ Error creating partner record:', createError);
            return;
        }
        partnerId = newPartner.id;
        console.log(`✅ Created New Partner Record: ${partnerId}`);
    }

    // 3. Update User Profile to Link Partner
    // (Derived role logic checks partner_id on profile for priority)
    const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
            partner_id: partnerId
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('❌ Error updating profile with partner_id:', updateError);
    } else {
        console.log('✅ User profile updated with partner_id.');
    }

}

grantPartner();
