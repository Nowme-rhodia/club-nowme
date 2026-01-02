import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCategory() {
    const slug = 'organisateur-datelier-de-seconde-main';
    console.log(`Checking for offer_category with slug: ${slug}`);

    // First, just check what we have
    const { data: allCats } = await supabase.from('offer_categories').select('slug');
    console.log('Available slugs:', allCats.map(c => c.slug));

    // Specific check
    const { data, error } = await supabase
        .from('offer_categories')
        .select('*')
        .eq('slug', slug);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${data.length} rows for slug "${slug}".`);
        if (data.length === 0) {
            console.log('DIAGNOSIS: The 406 error is likely because the code expects 1 row (.single()) but found 0.');
        } else if (data.length > 1) {
            console.log('DIAGNOSIS: The 406 error is likely because the code expects 1 row (.single()) but found multiple.');
        }
    }
}

checkCategory()
