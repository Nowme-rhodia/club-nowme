
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugFeedback() {
    console.log('Debugging feedback table...');

    // 1. Try to insert row with user_id
    const testId = crypto.randomUUID();
    // We need a valid user_id for FK constraint usually?
    // "REFERENCES auth.users(id) ON DELETE SET NULL"
    // If we use a random UUID it will fail FK if we don't have a user.
    // Let's create a user primarily? 
    // Or just try to insert with NULL user_id?

    console.log('Attempting insert with NULL user_id...');
    const { data, error } = await supabase.from('feedback').insert({
        category: 'debug',
        message: 'test',
        user_id: null
    }).select();

    if (error) {
        console.error('Insert NULL failed:', error);
    } else {
        console.log('Insert NULL succeeded:', data);
    }

    // 2. Try to insert with random user_id (expect FK error, NOT column error)
    console.log('Attempting insert with random user_id...');
    const { error: error2 } = await supabase.from('feedback').insert({
        category: 'debug',
        message: 'test fk',
        user_id: crypto.randomUUID()
    });

    if (error2) {
        console.log('Insert UserID error:', error2);
        if (error2.code === '42703') {
            console.error('CRITICAL: user_id column does not exist!');
        } else if (error2.code === '23503') {
            console.log('FK constraint works -> Column exists!');
        }
    }
}

debugFeedback();
