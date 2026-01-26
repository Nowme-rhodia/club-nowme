
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_EMAILS = [
    'mylen.nicolas@gmail.com',
    'bimakijanaw97@gmail.com'
];

async function deactivateUsers() {
    console.log(`🔒 Revoking access for unpaid users...`);
    console.log('---------------------------------------------------');

    for (const email of TARGET_EMAILS) {
        console.log(`\n📧 Processing: ${email}`);

        // 1. Find User
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (profileError || !userProfile) {
            console.error(`❌ User not found: ${profileError?.message || 'No data'}`);
            continue;
        }

        console.log(`   Current Status: ${userProfile.subscription_status}`);

        // 2. Deactivate
        const updates = {
            subscription_status: 'inactive', // or 'payment_pending' if you prefer, but inactive revokes access clearly
            subscription_updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('user_id', userProfile.user_id);

        if (updateError) {
            console.error(`❌ Failed to deactivate:`, updateError);
        } else {
            console.log(`✅ User DEACTIVATED successfully.`);
        }
    }
}

deactivateUsers();
