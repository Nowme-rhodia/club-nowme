import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import slugify from 'slugify'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CHANGES = [
    {
        targetParent: "Bien-être et relaxation",
        newSubs: ["Sophrologie"]
    },
    {
        targetParent: "Développement personnel et coaching",
        newSubs: ["Méditation", "Coach parentalité"]
    },
    {
        targetParent: "Loisirs et créativité",
        newSubs: ["Club de lecture / Book Club"]
    },
    {
        newMain: "Gastronomie & Art de la Table",
        newSubs: [
            "Oenologie & Dégustations",
            "Cours de Cuisine",
            "Brunchs & Food Tours",
            "Dîners Privés"
        ]
    }
]

async function addCategories() {
    console.log("🚀 Starting Category Updates...")

    for (const item of CHANGES) {
        if (item.targetParent) {
            // 1. Add to existing parent
            await addToExisting(item.targetParent, item.newSubs)
        } else if (item.newMain) {
            // 2. Create new main + subs
            await createNewMain(item.newMain, item.newSubs)
        }
    }

    console.log("✅ All updates completed.")
}

async function addToExisting(parentName, subNames) {
    console.log(`\n🔹 Processing parent: '${parentName}'...`)

    // Find Parent (it's a row with name=parentName and parent_name=null usually, 
    // BUT the schema seems to be a single 'offer_categories' table.
    // Based on list_offer_categories output, 'parent_name' column holds the parent name for a subcategory.
    // Main categories just have entries (maybe?) or we just insert rows with parent_name = parentName.

    // Let's verify if the parent exists as a "main" category entry or if it's just a grouping key.
    // From previous output: "Loisirs et créativité" appeared as a GROUP (parent_name).
    // So we just insert new rows with name = SubName and parent_name = ParentName.

    for (const sub of subNames) {
        const slug = slugify(sub, { lower: true, strict: true })

        // Check duplication
        const { data: existing } = await supabase
            .from('offer_categories')
            .select('id')
            .eq('name', sub)
            .eq('parent_name', parentName)
            .maybeSingle()

        if (existing) {
            console.log(`   🔸 Sub '${sub}' already exists. Skipping.`)
            continue
        }

        const { error } = await supabase.from('offer_categories').insert({
            name: sub,
            slug: slug,
            parent_name: parentName,
            // Attempt to generate a parent_slug from parentName if needed, but table structure showed parent_slug column exists
            parent_slug: slugify(parentName, { lower: true, strict: true })
        })

        if (error) {
            console.error(`   ❌ Error adding '${sub}':`, error.message)
        } else {
            console.log(`   ✅ Added '${sub}'`)
        }
    }
}

async function createNewMain(mainName, subNames) {
    console.log(`\n🔹 Creating new main category group: '${mainName}'...`)
    // Basically the same, just using this new name as parent_name
    await addToExisting(mainName, subNames)
}

addCategories()
