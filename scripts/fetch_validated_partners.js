
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

async function fetchValidatedPartners() {
    // Fetch validated partners
    const { data: partners, error } = await supabase
        .from('partners')
        .select('id, business_name, description, logo_url, cover_image_url, main_category_id')
        .eq('status', 'approved')
        .not('business_name', 'is', null)
        .order('business_name', { ascending: true });

    if (error) {
        console.error('Error fetching partners:', error);
        return;
    }

    console.log(`Found ${partners.length} validated partners`);

    // Group by category
    const byCategory = {};
    partners.forEach(p => {
        const categoryName = p.categories?.name || 'Sans catégorie';
        if (!byCategory[categoryName]) {
            byCategory[categoryName] = [];
        }
        byCategory[categoryName].push({
            name: p.business_name,
            description: p.description,
            logo: p.logo_url,
            cover: p.cover_image_url,
            category: categoryName
        });
    });

    // Write to file
    fs.writeFileSync(
        path.join(process.cwd(), 'partners_by_category.json'),
        JSON.stringify(byCategory, null, 2)
    );

    console.log('\nPartners by category:');
    Object.keys(byCategory).forEach(cat => {
        console.log(`\n${cat} (${byCategory[cat].length}):`);
        byCategory[cat].forEach(p => {
            console.log(`  - ${p.name}`);
            console.log(`    Logo: ${p.logo ? '✓' : '✗'}`);
            console.log(`    Cover: ${p.cover ? '✓' : '✗'}`);
        });
    });

    console.log('\n✅ Data written to partners_by_category.json');
}

fetchValidatedPartners();
