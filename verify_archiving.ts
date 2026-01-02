
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyArchiving() {
    console.log("Starting verification...");

    // 1. Create a dummy expired community content
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 1); // 1 hour ago

    const { data: inserted, error: insertError } = await supabase
        .from('community_content')
        .insert({
            type: 'announcement',
            title: 'TEST_EXPIRED_CONTENT',
            content: 'This should be archived',
            event_date: expiredDate.toISOString(),
            is_active: true
        })
        .select()
        .single();

    if (insertError) {
        console.error("Insert failed:", insertError);
        return;
    }
    console.log("Inserted test content:", inserted.id);

    // 2. Call the archiving function
    console.log("Calling archive_expired_content...");
    const { error: rpcError } = await supabase.rpc('archive_expired_content');

    if (rpcError) {
        console.error("RPC failed:", rpcError);
        return;
    }

    // 3. Verify it's archived
    const { data: check, error: checkError } = await supabase
        .from('community_content')
        .select('is_active')
        .eq('id', inserted.id)
        .single();

    if (checkError) {
        console.error("Check failed:", checkError);
        return;
    }

    if (check.is_active === false) {
        console.log("SUCCESS: Content was archived!");
    } else {
        console.error("FAILURE: Content is still active.");
    }

    // Cleanup
    await supabase.from('community_content').delete().eq('id', inserted.id);
}

verifyArchiving();
