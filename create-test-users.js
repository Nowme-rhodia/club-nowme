import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Erreur: SUPABASE_URL ou SERVICE_ROLE_KEY manquant dans .env")
  process.exit(1)
}


console.log("Checking Env Vars...")
console.log("URL:", !!process.env.VITE_SUPABASE_URL)
console.log("KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY) // Should be true


console.log("Checking Env Vars...")
console.log("URL:", !!process.env.VITE_SUPABASE_URL)
console.log("KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY) // Should be true

// Admin client for DB operations (bypasses RLS)
const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper to check user credentials without polluting admin client
async function checkCredentials(email, password) {
  // Only if ANON key is available, else we can't easily sign in as user without admin privilege confusion?
  // Actually we can use the URL and ANON key (usually public).
  // Start with process.env.VITE_SUPABASE_ANON_KEY
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    // Fallback: use service role but beware of side effects if we reused the client.
    // But here we create a NEW client.
    const tempClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await tempClient.auth.signInWithPassword({ email, password });
    return data?.user;
  }
  const tempClient = createClient(process.env.VITE_SUPABASE_URL, anonKey);
  const { data } = await tempClient.auth.signInWithPassword({ email, password });
  return data?.user;
}

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
  console.log(`🗑️ Suppression éventuelle des anciens profils...`)
  const { error } = await adminSupabase.from('user_profiles').delete().in('email', emails)
  await adminSupabase.from('partners').delete().in('email', emails)
  console.log("✅ Nettoyage terminé")
}

// 🔹 Créer un utilisateur auth ou récupérer l'existant
async function createAuthUser({ email, password, role }) {
  console.log(`👤 Création/Récupération de l'utilisateur auth: ${email}...`)
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  })

  if (error) {
    // Fallback robust: Try to sign in to get the ID
    console.log(`ℹ️ Tentative de connexion pour récupérer l'ID de ${email}...`);
    const user = await checkCredentials(email, password);

    if (user) {
      console.log(`✅ Utilisateur récupéré par connexion: ${user.id}`);
      return user;
    } else {
      console.log(`⚠️ Échec de connexion de récupération.`);
    }

    // Listing users fallback (kept as backup but seemingly unreliable)
    const { data: listData } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users.find(u => u.email === email);
    if (existing) {
      console.log(`✅ Utilisateur existant récupéré (list): ${existing.id}`);
      return existing;
    }
    console.error(`⚠️ Erreur création ${email}:`, error.message)
    return null
  }
  console.log(`✅ Utilisateur auth créé ${email}: ${data.user.id}`)
  return data.user
}

// 🔹 Link manually if edge function fails or just do it manually
async function linkManual(email, authUserId, role) {
  console.log(`🔗 Liaison manuelle pour ${email} (${role})...`);

  // 1. Check/Create Partner if role is partner
  let partnerId = null;
  if (role === 'partner') {
    const { data: existingPartner } = await adminSupabase.from('partners').select('id').eq('contact_email', email).maybeSingle();
    if (existingPartner) {
      partnerId = existingPartner.id;
    } else {
      const { data: newPartner, error: partnerError } = await adminSupabase.from('partners').insert({
        contact_email: email,
        business_name: "Entreprise Test",
        status: 'approved' // Auto approve for test
      }).select().single();

      if (partnerError) throw new Error(`Failed to create partner: ${partnerError.message}`);
      partnerId = newPartner.id;
    }
  }

  // 2. Upsert User Profile
  const { error: profileError } = await adminSupabase.from('user_profiles').upsert({
    user_id: authUserId,
    email: email,
    partner_id: partnerId,
    is_admin: role === 'admin',
    first_name: role === 'partner' ? 'Partenaire' : (role === 'admin' ? 'Admin' : 'Subscriber'),
    last_name: 'Test'
  }, { onConflict: 'user_id' });

  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);
  console.log(`✅ Profil lié manuellement: ${email}`);
}

async function link(email, authUserId, role) {
  try {
    await linkManual(email, authUserId, role);
  } catch (e) {
    console.error(`Link manual failed: ${e.message}`);
    // Fallback or retry?
    throw e;
  }
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
      // Vérifier via user_profiles car partners n'a pas user_id
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("partner_id")
        .eq("user_id", userId)
        .single();

      if (profile?.partner_id) {
        ({ data, error } = await supabase
          .from("partners")
          .select("id, contact_email, status, created_at")
          .eq("id", profile.partner_id)
          .maybeSingle());

        if (data) data.user_id = userId;
      }
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
