import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

// ⚠️ Variables d'environnement (dans ton .env)
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Erreur: SUPABASE_URL ou SERVICE_ROLE_KEY manquant dans .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 📌 Liste des utilisateurs de test
const USERS = [
  { email: "abonne-testmoibiensk@nowme.fr", password: "Password123!", role: "subscriber" },
  { email: "partner-testmoibiensk@nowme.fr", password: "Password123!", role: "partner" }
]

// 🔹 Supprimer les profils existants
async function resetProfiles(emails) {
  for (const email of emails) {
    console.log(`🗑️ Suppression éventuelle du profil ${email}...`)
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?email=eq.${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: "return=representation"
        }
      }
    )
    if (!resp.ok) {
      console.error(`❌ Échec suppression profil ${email}: ${resp.status} ${await resp.text()}`)
      continue
    }
    const rows = resp.status === 200 ? await resp.json() : []
    if (rows.length) {
      console.log(`✅ Profil supprimé: ${rows.length} lignes pour ${email}`)
    } else {
      console.log(`ℹ️ Aucun profil existant pour ${email}`)
    }
  }
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
async function link(email, authUserId) {
  console.log(`🔗 Liaison profil pour ${email} avec authUserId ${authUserId}...`)
  const r = await fetch(`${SUPABASE_URL}/functions/v1/link-auth-to-profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, authUserId })
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`❌ Échec liaison ${email}: ${r.status} ${t}`)
  console.log(`✅ Profil lié avec succès: ${email}`)
}

// 🔹 Vérifier les profils créés
async function listProfiles(emails) {
  console.log("\n📋 Vérification dans user_profiles:")
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, user_id, subscription_status, created_at")
    .in("email", emails)

  if (error) {
    console.error("❌ Erreur récupération user_profiles:", error.message)
    return []
  }
  if (!data || data.length === 0) {
    console.log("⚠️ Aucun profil trouvé pour ces emails.")
    return []
  }
  for (const p of data) {
    console.log(`   • ${p.email} → profile_id=${p.id}, user_id=${p.user_id}, status=${p.subscription_status}, créé le ${p.created_at}`)
  }
  return data
}

// 🔹 Vérifier aussi côté auth.users
async function listAuthUsers(emails) {
  console.log("\n📋 Vérification dans auth.users:")
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error("❌ Erreur récupération auth.users:", error.message)
    return []
  }
  const found = data.users.filter(u => emails.includes(u.email))
  for (const user of found) {
    console.log(`   • ${user.email} → auth_id=${user.id}, confirmé=${user.email_confirmed_at ? "✅" : "❌"}`)
  }
  return found
}

// 🔹 Vérification croisée user_profiles <-> auth.users
function crossCheck(profiles, authUsers) {
  console.log("\n🔎 Vérification croisée user_profiles.user_id === auth.users.id:")
  for (const profile of profiles) {
    const match = authUsers.find(u => u.email === profile.email)
    if (!match) {
      console.log(`❌ Pas de auth.user trouvé pour ${profile.email}`)
      continue
    }
    if (profile.user_id === match.id) {
      console.log(`✅ OK: ${profile.email} → profile.user_id et auth.id correspondent (${profile.user_id})`)
    } else {
      console.log(`⚠️ Mismatch: ${profile.email} → profile.user_id=${profile.user_id}, auth.id=${match.id}`)
    }
  }
}

async function main() {
  try {
    console.log("🚀 Démarrage script de création des utilisateurs de test...")

    // 1️⃣ Nettoyer anciens profils
    await resetProfiles(USERS.map(u => u.email))

    // 2️⃣ Créer les utilisateurs
    const created = []
    for (const u of USERS) {
      const user = await createAuthUser(u)
      if (user) created.push({ ...u, id: user.id })
    }

    // 3️⃣ Lier profils aux comptes auth
    for (const u of created) {
      await link(u.email, u.id)
    }

    // 4️⃣ Vérification finale
    const profiles = await listProfiles(USERS.map(u => u.email))
    const authUsers = await listAuthUsers(USERS.map(u => u.email))
    crossCheck(profiles, authUsers)

    console.log("\n🎯 Script terminé avec succès ✅")
  } catch (e) {
    console.error("❌ Erreur dans le script:", e)
    process.exit(1)
  }
}

main()
