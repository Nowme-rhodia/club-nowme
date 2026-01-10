import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function inspectSchema() {
    console.log("🔍 Inspecting 'offers' table columns...")
    const { data: offersColumns, error: offersError } = await supabase
        .rpc('get_table_columns', { table_name: 'offers' })

    if (offersError) {
        // Fallback if RPC doesn't exist (it usually doesn't by default), try error message or just select * limit 1
        console.log("RPC failed, trying select * limit 1 on offers...")
        const { data: offers } = await supabase.from('offers').select('*').limit(1)
        if (offers && offers.length > 0) {
            console.log("Offers Keys:", Object.keys(offers[0]))
        }
    } else {
        console.log(offersColumns)
    }

    console.log("\n🔍 Listing all tables in public schema...")
    // Cannot easily list tables via client without specific permissions or RPC. 
    // Attempting to guess standard names or finding via 'categories' select.

    const tablesToCheck = ['categories', 'offer_categories', 'subcategories', 'tags']
    for (const t of tablesToCheck) {
        const { data, error } = await supabase.from(t).select('*').limit(1)
        if (!error) {
            console.log(`✅ Table '${t}' exists. Keys:`, data.length > 0 ? Object.keys(data[0]) : '(empty)')
        } else {
            console.log(`❌ Table '${t}' access error: ${error.message}`)
        }
    }
}

inspectSchema()
