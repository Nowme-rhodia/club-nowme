const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkNotifications() {
    console.log('--- Checking Notifications for Feb 24 ---');
    const startOfDay = "2026-02-24T00:00:00Z";
    const endOfDay = "2026-02-24T23:59:59Z";

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .gt('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${data.length} notifications on Feb 24.`);
        if (data.length > 0) {
            console.table(data.map(n => ({
                id: n.id,
                user_id: n.user_id,
                type: n.type,
                created_at: n.created_at
            })));
        }
    }
}

checkNotifications();
