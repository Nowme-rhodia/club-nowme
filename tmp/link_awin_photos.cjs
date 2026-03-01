const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const awinLinks = [
    { name: 'Maison des Fragrances', url: 'https://www.awin1.com/cshow.php?s=3897180&v=115403&q=514663&r=2763648' },
    { name: 'Darty', url: 'https://www.awin1.com/cshow.php?s=4683760&v=7735&q=309130&r=2763648' },
    { name: 'Sport Découverte', url: 'https://www.awin1.com/cshow.php?s=3667506&v=75954&q=493200&r=2763648' },
    { name: 'Dee Sup', url: 'https://www.awin1.com/cshow.php?s=4657083&v=123276&q=594020&r=2763648' },
    { name: 'monbento', url: 'https://www.awin1.com/cshow.php?s=4208259&v=16889&q=361086&r=2763648' },
    { name: 'La Couette Française', url: 'https://www.awin1.com/cshow.php?s=4685572&v=124156&q=596508&r=2763648' },
    { name: 'French Mush', url: 'https://www.awin1.com/cshow.php?s=4636638&v=122312&q=592392&r=2763648' },
    { name: 'ASMC', url: 'https://www.awin1.com/cshow.php?s=3328720&v=43309&q=457781&r=2763648' },
    { name: 'Bonjour Drink', url: 'https://www.awin1.com/cshow.php?s=4616910&v=122146&q=590688&r=2763648' },
    // Optional if already created, else we'll skip for now
    { name: 'MOYU', url: 'https://www.awin1.com/cshow.php?s=3786307&v=107894&q=505116&r=2763648' },
    { name: 'Les Secrets de Loly', url: 'https://www.awin1.com/cshow.php?s=4676361&v=120431&q=595693&r=2763648' },
    { name: 'Made in Paradis', url: 'https://www.awin1.com/cshow.php?s=3695995&v=65148&q=495691&r=2763648' },
];

async function main() {
    const { data: partners, error } = await supabase.from('partners').select('id, business_name, logo_url');

    if (error) {
        console.error('Error fetching partners:', error);
        return;
    }

    let updated = 0;

    for (const item of awinLinks) {
        // Find matching partner
        const match = partners.find(p => p.business_name.toLowerCase().includes(item.name.toLowerCase()));

        if (match) {
            console.log(`Updating ${match.business_name} with logo ${item.url}`);

            const { error: updateErr } = await supabase
                .from('partners')
                .update({ cover_image_url: item.url }) // awin banners are usually wide, so setting as cover
                .eq('id', match.id);

            if (!updateErr) {
                updated++;
            } else {
                console.error("Failed to update:", updateErr);
            }
        } else {
            console.log(`⚠️ No partner found matching name: ${item.name}`);
        }
    }

    console.log(`\nFinished updating ${updated} partners.`);
}

main();
