const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // 1. Get a sample partner to see actual columns
    const { data: sample, error: sampleErr } = await supabase
        .from('partners')
        .select('*')
        .limit(1);
    if (sampleErr) { console.error('sample error:', sampleErr); }
    else {
        console.log('Partner columns:', Object.keys(sample[0]));
        console.log('Sample partner:', JSON.stringify(sample[0], null, 2));
    }

    // 2. Get offer_categories columns
    const { data: catSample, error: catErr } = await supabase
        .from('offer_categories')
        .select('*')
        .limit(3);
    if (catErr) { console.error('categories error:', catErr); }
    else {
        console.log('\nOffer categories columns:', Object.keys(catSample[0] || {}));
        catSample.forEach(c => console.log(JSON.stringify(c)));
    }
}

main();
