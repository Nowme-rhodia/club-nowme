const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // 1. Find all rhodia+ user accounts
    const { data: users, error: userError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .like('email', '%rhodia+%');

    if (userError) { console.error('user error:', userError); return; }
    console.log('rhodia+ accounts:');
    users.forEach(u => console.log(`  ${u.email} -> ${u.id}`));

    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return;

    // 2. Get partner profiles with minimal columns (to not hit column errors)
    const { data: p1, error: e1 } = await supabase
        .from('partners')
        .select('id, user_id, business_name, description, slug, status, website, instagram, cover_image_url, contact_email')
        .in('user_id', userIds);

    if (e1) { console.error('partners error:', e1); return; }

    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    console.log('\nPartner profiles:');
    p1.forEach(p => {
        const u = userMap[p.user_id];
        console.log(`\n  ${p.business_name} (${u?.email})`);
        console.log(`    slug: ${p.slug}, status: ${p.status}`);
        console.log(`    description: ${p.description ? p.description.substring(0, 60) + '...' : 'EMPTY'}`);
        console.log(`    cover: ${p.cover_image_url ? 'present' : 'EMPTY'}`);
        console.log(`    website: ${p.website || 'EMPTY'}`);
        console.log(`    instagram: ${p.instagram || 'EMPTY'}`);
        console.log(`    contact_email: ${p.contact_email || 'EMPTY'}`);
    });

    // 3. Check offer_categories
    const { data: cats, error: catErr } = await supabase
        .from('offer_categories')
        .select('id, name, slug, parent_id')
        .order('name');
    if (catErr) { console.error('categories error:', catErr); }
    else {
        console.log('\nAll categories:');
        cats.forEach(c => console.log(`  [parent=${c.parent_id || 'root'}] ${c.name} (${c.slug})`));
    }
}

main();
