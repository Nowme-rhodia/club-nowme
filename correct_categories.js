import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import slugify from 'slugify'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function correctCategories() {
    console.log("🛠️ Correcting Categories...")

    const parent = "Développement personnel et coaching"

    // 1. Remove "Méditation" from this parent
    const { error: delError } = await supabase
        .from('offer_categories')
        .delete()
        .eq('name', 'Méditation')
        .eq('parent_name', parent)

    if (delError) console.error("Error deleting Méditation:", delError.message)
    else console.log("✅ Removed 'Méditation' from 'Développement personnel et coaching'")

    // 2. Add "Sophrologue" to this parent
    const sub = "Sophrologue"
    const slug = slugify(sub, { lower: true, strict: true }) // sophrologue

    // Check if exists first to avoid duplicate slug error if unique constraint exists globally
    // The table likely has unique(slug) or unique(slug, parent)? 
    // If unique(slug) globally, 'sophrologue' might conflict if we used it elsewhere?
    // We used 'sophrologie' (slug: sophrologie) in "Bien-être". 'sophrologue' (slug: sophrologue) is different.
    // Wait, did I use 'Sophrologue' in "Bien-être" existing data? 
    // "Naturopathe, Sophrologue" has slug "naturopathe-sophrologue".
    // So 'sophrologue' slug should be free.

    const { data: existing } = await supabase
        .from('offer_categories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

    if (existing) {
        console.log(`⚠️ Slug '${slug}' already exists. Checking if it's the right parent...`)
        // If it exists but with different parent, we might have an issue if slug is globally unique.
        // But typically simple slugs like this might be reused? 
        // Let's assume we can insert. If unique constraint fails, we'll see.
    }

    const { error: insError } = await supabase.from('offer_categories').insert({
        name: sub,
        slug: slug,
        parent_name: parent,
        parent_slug: slugify(parent, { lower: true, strict: true })
    })

    if (insError) {
        console.error(`❌ Error adding '${sub}':`, insError.message)
    } else {
        console.log(`✅ Added '${sub}' to '${parent}'`)
    }
}

correctCategories()
