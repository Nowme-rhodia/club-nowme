const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // 1. Get the required categories
    const { data: categories } = await supabase
        .from('offer_categories')
        .select('id, slug, name')
        .in('slug', ['produits', 'bien-etre-et-relaxation', 'sport-et-activites-physiques']);

    const catMap = {};
    categories.forEach(c => catMap[c.slug] = c.id);

    console.log('Category IDs:', catMap);

    // 2. Update Zenou -> 'bien-etre-et-relaxation'
    if (catMap['bien-etre-et-relaxation']) {
        const { data, error } = await supabase
            .from('partners')
            .update({ main_category_id: catMap['bien-etre-et-relaxation'] })
            .ilike('business_name', '%zenou%')
            .select('business_name');
        console.log('Zenou updated:', data);
    }

    // 3. Update Rhodia partners
    // category_slug: 'produits'
    const produitBrands = ['Bonjour Drink', 'Darty', 'ASMC', 'Hairlust', 'French Mush', 'La Couette Française', 'Fnac', 'monbento', 'Maison des Fragrances'];
    // category_slug: 'sport-et-activites-physiques' (since sport-et-detente probably wasn't found)
    const sportBrands = ['Dee Sup', 'Sport Découverte'];

    if (catMap['produits']) {
        const { data, error } = await supabase
            .from('partners')
            .update({ main_category_id: catMap['produits'] })
            .in('business_name', produitBrands)
            .select('business_name');
        console.log('Produits partners updated:', data?.length || 0);
    }

    if (catMap['sport-et-activites-physiques']) {
        const { data, error } = await supabase
            .from('partners')
            .update({ main_category_id: catMap['sport-et-activites-physiques'] })
            .in('business_name', sportBrands)
            .select('business_name');
        console.log('Sport partners updated:', data?.length || 0);
    }
}

main();
