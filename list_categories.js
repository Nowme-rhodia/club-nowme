import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function listCategories() {
    const { data: categories, error } = await supabase
        .from('categories')
        .select(`
      id, 
      name, 
      slug,
      subcategories (
        id,
        name,
        slug
      )
    `)
        .order('name')

    if (error) {
        console.error(error)
        return
    }

    console.log("Current Categories Hierarchy:")
    categories.forEach(c => {
        console.log(`\n📂 ${c.name} (${c.slug})`)
        if (c.subcategories && c.subcategories.length > 0) {
            c.subcategories.forEach(s => console.log(`   - ${s.name} (${s.slug})`))
        } else {
            console.log("   (No subcategories)")
        }
    })
}

listCategories()
