import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function listOfferCategories() {
    const { data: categories, error } = await supabase
        .from('offer_categories')
        .select('*')
        .order('parent_name', { ascending: true })
        .order('name', { ascending: true })

    if (error) {
        console.error(error)
        return
    }

    console.log(`Found ${categories.length} categories/subcategories:`)
    console.table(categories.map(c => ({
        id: c.id,
        Parent: c.parent_name,
        Subcategory: c.name,
        Slug: c.slug
    })))
}

listOfferCategories()
