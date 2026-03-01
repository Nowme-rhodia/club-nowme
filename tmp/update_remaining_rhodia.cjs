const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: catData } = await supabase
        .from('offer_categories')
        .select('id')
        .eq('slug', 'produits')
        .single();

    if (!catData) {
        console.error("Category 'produits' not found");
        return;
    }

    const sportBrands = ['Dee Sup', 'Sport Découverte'];

    const { data, error } = await supabase
        .from('partners')
        .update({ main_category_id: catData.id })
        .in('business_name', sportBrands)
        .select('business_name');

    if (error) {
        console.error("Error updating:", error);
    } else {
        console.log('Successfully updated to Produits:', data);
    }
}

main();
