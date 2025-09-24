import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Erreur: SUPABASE_URL ou SERVICE_ROLE_KEY manquant dans .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const USERS = [
  { email: "abonnex-test@nowme.fr", password: "Password123!", role: "subscriber" },
  { email: "partnerx-test@nowme.fr", password: "Password123!", role: "partner" },
  { email: "adminx-test@nowme.fr", password: "Password123!", role: "admin" }
]

// 💤 Pause utilitaire
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 🔹 Supprimer les profils existants
async function resetProfiles(emails) {
  console.log("🗑️ Suppression éventuelle des anciens profils...")
  await supabase.from('user_profiles').delete().in('email', emails)
  await supabase.from('partners').delete().in('email', emails)
  console.log("✅ Nettoyage terminé")
}

// 🔹 Créer un utilisateur auth
async function createAuthUser({ email, password, role }) {
  console.log(`👤 Création de l'utilisateur auth: ${email}...`)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  })
  if (error) {
    console.error(`⚠️ Erreur création ${email}:`, error.message)
    return null
  }
  console.log(`✅ Utilisateur auth créé ${email}: ${data.user.id}`)
  return data.user
}

// 🔹 Lier profil via Edge Function
async function link(email, authUserId, role) {
  console.log(`🔗 Liaison profil pour ${email} (${role})...`)
  const { error } = await supabase.functions.invoke('link-auth-to-profile', {
    body: { email, authUserId, role }
  })
  if (error) throw new Error(`❌ Échec liaison ${email}: ${error.message}`)
  console.log(`✅ Profil lié avec succès: ${email}`)
}

// 🔹 Vérification selon rôle
async function waitForProfile(userId, email, role) {
  const delays = [200, 400, 800, 1600, 3200]

  for (const d of delays) {
    let data, error

    if (role === "subscriber" || role === "admin") {
      ({ data, error } = await supabase
        .from("user_profiles")
        .select("id, email, user_id, created_at")
        .eq("user_id", userId)
        .maybeSingle())
    } else if (role === "partner") {
      ({ data, error } = await supabase
        .from("partners")
        .select("id, email, user_id, status, created_at")
        .eq("user_id", userId)
        .maybeSingle())
    }

    if (data) {
      console.log(
        `✅ ${role} trouvé pour ${email}: user_id=${data.user_id} status=${data.status ?? 'n/a'}`
      )
      return data
    }

    if (error && error.code !== "PGRST116") {
      console.error(`❌ Erreur récupération profil ${email}:`, error.message)
      throw error
    }

    console.log(`⏳ Profil ${email} introuvable, retry dans ${d}ms...`)
    await sleep(d)
  }

  throw new Error(`❌ Profil non trouvé après retries: ${email}`)
}

// 🔹 Main
async function main() {
  try {
    console.log("🚀 Démarrage script de création des utilisateurs de test...")

    await resetProfiles(USERS.map(u => u.email))

    const created = []
    for (const u of USERS) {
      const user = await createAuthUser(u)
      if (user) created.push({ ...u, id: user.id })
    }

    for (const u of created) {
      await link(u.email, u.id, u.role)
    }

    console.log("\n📋 Vérification des créations:")
    for (const u of created) {
      await waitForProfile(u.id, u.email, u.role)
    }

    console.log("\n🎯 Script terminé avec succès ✅")
  } catch (e) {
    console.error("❌ Erreur dans le script:", e)
    process.exit(1)
  }
}

main()
