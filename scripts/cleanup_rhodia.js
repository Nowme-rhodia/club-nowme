
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Erreur: SUPABASE_URL ou SERVICE_ROLE_KEY manquant dans .env")
    process.exit(1)
}

// Admin client for DB operations (bypasses RLS)
const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function cleanup() {
    const email = 'rhodia@nowme.fr'
    console.log(`🧹 Démarrage du nettoyage pour ${email}...`)

    // 1. Delete from auth.users (cascades to user_profiles usually, but we'll check)
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers()

    if (listError) {
        console.error('❌ Erreur recuperation utilisateurs:', listError)
    }

    const user = users.find(u => u.email === email)

    if (user) {
        console.log(`👤 Utilisateur Auth trouvé: ${user.id}. Suppression...`)
        const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(user.id)
        if (deleteAuthError) {
            console.error('❌ Erreur suppression Auth:', deleteAuthError)
        } else {
            console.log('✅ Utilisateur Auth supprimé.')
        }
    } else {
        console.log('ℹ️ Aucun utilisateur Auth trouvé.')
    }

    // 2. Delete from public.partners explicitly (just in case)
    console.log(`🏢 Suppression du partenaire...`)
    const { error: deletePartnerError } = await adminSupabase
        .from('partners')
        .delete()
        .eq('contact_email', email)

    if (deletePartnerError) {
        console.error('❌ Erreur suppression Partner:', deletePartnerError)
    } else {
        console.log('✅ Partenaire supprimé (si présent).')
    }

    // 3. Delete from public.user_profiles explicitly (just in case cascade failed)
    console.log(`👤 Suppression du profil...`)
    const { error: deleteProfileError } = await adminSupabase
        .from('user_profiles')
        .delete()
        .eq('email', email)

    if (deleteProfileError) {
        console.error('❌ Erreur suppression Profile:', deleteProfileError)
    } else {
        console.log('✅ Profil supprimé (si présent).')
    }

    console.log('✨ Nettoyage terminé.')
}

cleanup()
