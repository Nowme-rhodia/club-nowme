
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('offers').select('video_url').limit(1);
    if (error) {
        if (error.message && (error.message.includes('column') || error.message.includes('does not exist') || error.message.includes('video_url'))) {
            console.log('MISSING - ' + error.message);
        } else {
            console.log('ERROR: ' + error.message);
        }
    } else {
        console.log('EXISTS');
    }
}

check();
