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
    console.error('Error: Missing env variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const originalEmail = 'rhodia@nowme.fr';
const targetEmail = 'rhodia.partner@nowme.fr';
const password = 'StartPassword123!';

async function approvePartner() {
    console.log(`--- Manually Approving Partner: Switching to ${targetEmail} ---`);

    // 1. Find Pending Partner Request
    const { data: partnerReq, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .or(`contact_email.ilike.${originalEmail},contact_email.ilike.${targetEmail}`)
        .maybeSingle();

    if (partnerError) {
        console.error('❌ Error searching partner:', partnerError);
        return;
    }

    if (!partnerReq) {
        console.error('❌ No partner request found for this email.');
        return;
    }

    console.log(`✅ Found Partner Request: ID=${partnerReq.id}, Status=${partnerReq.status}`);
    const partnerId = partnerReq.id;

    // Update contact email if it differs
    if (partnerReq.contact_email !== targetEmail) {
        console.log('🔄 Updating partner contact_email to new functional email...');
        const { error: updateEmailError } = await supabase.from('partners').update({ contact_email: targetEmail }).eq('id', partnerId);
        if (updateEmailError) console.error('Error updating email:', updateEmailError);
    }

    // 2. Find/Create User
    let userId;

    // Try to find user if exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    // Note: listUsers might not return all if > 50, but we assume new user doesn't exist or is recent
    const foundUser = users?.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

    if (foundUser) {
        userId = foundUser.id;
        console.log(`✅ Found existing user: ${userId}`);
    } else {
        console.log('Attempting to create user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: targetEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                first_name: partnerReq.contact_name?.split(' ')[0] || 'Partner',
                last_name: partnerReq.contact_name?.split(' ').slice(1).join(' ') || ''
            }
        });

        if (authError) {
            console.log('⚠️ createUser error:', authError.message);
            return;
        }

        userId = authData.user.id;
        console.log(`✅ Created new user: ${userId} with password ${password}`);
    }

    // Create/Update profile
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            user_id: userId,
            email: targetEmail,
            first_name: partnerReq.contact_name?.split(' ')[0],
            is_admin: false,
            partner_id: partnerId
        });

    if (profileError) console.error('Error upserting profile:', profileError);
    else console.log('✅ User profile created/updated.');

    // 3. Update Partner Record Status
    const { error: updatePartnerError } = await supabase
        .from('partners')
        .update({
            status: 'approved',
            user_id: userId
        })
        .eq('id', partnerId);

    if (updatePartnerError) console.error('❌ Error updating partner status:', updatePartnerError);
    else console.log('✅ Partner status set to approved.');

}

approvePartner();
