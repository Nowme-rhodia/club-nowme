const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const photoMapping = {
    'axel-vannier.png': 'Axel VANNIER', // use ilike for matching
    'cabinet-borges.png': 'Borges',
    'cosmiquelife.png': 'COSMIQUELIFE',
    'dj-prive.png': 'DJ PRIVÉ',
    'eden-des-sens.png': 'EDEN DES SENS',
    'karima-hassani.png': 'Karima Hassani',
    'la-gatine.png': 'gâtine', // or La gatine
    'le-temps-des-savoir-faire.png': 'savoir-faire',
    'level-up-event.png': 'level up',
    'ma-vie-bien-etre.png': 'ma vie',
    'rafaelle-djian.png': 'Rafaelle Djian',
    'roze-sylvie.png': 'Sylvie', // ROZE Sylvie
    'sabrina-talot.png': 'Sabrina Talot',
    'simple-coffee.png': 'Simple Coffee'
};

async function main() {
    const { data: partners, error } = await supabase.from('partners').select('id, business_name, cover_image_url');

    if (error) {
        console.error('Error fetching partners:', error);
        return;
    }

    let updated = 0;

    for (const [filename, keyword] of Object.entries(photoMapping)) {
        // Find matching partner
        const match = partners.find(p => p.business_name.toLowerCase().includes(keyword.toLowerCase()));

        if (match) {
            if (!match.cover_image_url || match.cover_image_url === '') {
                const photoUrl = `/partner-photos/${filename}`;
                console.log(`Updating ${match.business_name} with photo ${photoUrl}`);

                await supabase
                    .from('partners')
                    .update({ cover_image_url: photoUrl })
                    .eq('id', match.id);

                updated++;
            } else {
                console.log(`Skipping ${match.business_name}, already has cover: ${match.cover_image_url}`);
            }
        } else {
            console.log(`⚠️ No partner found matching keyword: ${keyword}`);
        }
    }

    console.log(`\nFinished updating ${updated} partners.`);
}

main();
