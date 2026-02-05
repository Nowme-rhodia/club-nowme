import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPartnerDetails() {
    const { data: partners, error } = await supabase
        .from('partners')
        .select('id, business_name, description, logo_url, cover_image_url, address, website, instagram, facebook')
        .eq('status', 'approved')
        .not('business_name', 'is', null)
        .order('business_name', { ascending: true });

    if (error) {
        console.error('Error fetching partners:', error);
        return;
    }

    // Extract city/department from address
    const partnersWithLocation = partners.map(p => {
        let location = '';
        if (p.address) {
            // Try to extract postal code and city
            const match = p.address.match(/(\d{5})\s+([^,]+)/);
            if (match) {
                const postalCode = match[1];
                const city = match[2].trim();
                const dept = postalCode.substring(0, 2);
                location = `${city} (${dept})`;
            } else {
                // Fallback: just use the address
                location = p.address.split(',')[0];
            }
        }

        return {
            name: p.business_name,
            description: p.description,
            logo: p.logo_url,
            cover: p.cover_image_url,
            location: location,
            website: p.website,
            instagram: p.instagram,
            facebook: p.facebook
        };
    });

    fs.writeFileSync(
        path.join(process.cwd(), 'partners_with_details.json'),
        JSON.stringify(partnersWithLocation, null, 2)
    );

    console.log('✅ Partner details saved to partners_with_details.json');

    // Show partners without photos
    const withoutPhotos = partnersWithLocation.filter(p => !p.cover && !p.logo);
    console.log(`\n📸 ${withoutPhotos.length} partners without photos:`);
    withoutPhotos.forEach(p => {
        console.log(`\n${p.name}`);
        console.log(`  Location: ${p.location || 'N/A'}`);
        console.log(`  Website: ${p.website || 'N/A'}`);
        console.log(`  Instagram: ${p.instagram || 'N/A'}`);
    });
}

fetchPartnerDetails();
