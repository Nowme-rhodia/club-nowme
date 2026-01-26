
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
    'bimakijanaw97@gmail.com',
    'aboneetest@gmail.com',
    'hasnafoutouh@outlook.fr',
    'mylen.nicolas@gmail.com'
];

async function verifyStatus() {
    console.log('---------------------------------------------------');
    console.log('🔍 CURRENT DATABASE STATUS (MOMENT T):');
    console.log('---------------------------------------------------');

    const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('email, subscription_status, stripe_customer_id')
        .in('email', TARGET_EMAILS);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    profiles.forEach(p => {
        console.log(`Email: ${p.email.padEnd(30)} | Status: ${String(p.subscription_status).padEnd(10)} | Stripe ID: ${p.stripe_customer_id}`);
    });
    console.log('---------------------------------------------------');
}

verifyStatus();
