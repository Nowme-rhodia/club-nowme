// admin-recreate-user.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

// ✅ Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

// ✅ Fonction pour gérer les requêtes OPTIONS (preflight)
function handleOptions(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  })
}

// ✅ Fonction principale
Deno.serve(async (req) => {
  // ✅ Gérer OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') return handleOptions(req)

  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  }

  // ✅ Refuser autre chose que POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: responseHeaders
    })
  }

  // ✅ Vérifie le header d'authentification
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: responseHeaders
    })
  }

  try {
    // ✅ Initialise Supabase avec la clé service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // ✅ Récupère les données envoyées
    const { email, password, redirectTo } = await req.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email et mot de passe requis' }), {
        status: 400,
        headers: responseHeaders
      })
    }

    console.log(`📨 Tentative de création ou recréation pour ${email}`)

    // ✅ 1. Vérifie si l’utilisateur existe
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email)

    if (getUserError && getUserError.message !== 'User not found') {
      console.error('❌ Erreur getUserByEmail:', getUserError.message)
      return new Response(JSON.stringify({ error: getUserError.message }), {
        status: 400,
        headers: responseHeaders
      })
    }

    // ✅ 2. Supprime s’il existe (soft delete)
    if (existingUser) {
      console.log(`🧹 Utilisateur trouvé : ${existingUser.id} → suppression...`)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id, true)

      if (deleteError) {
        console.error('❌ Erreur deleteUser:', deleteError.message)
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: responseHeaders
        })
      }
    }

    // ✅ 3. Crée l’utilisateur
    console.log(`🚀 Création du nouvel utilisateur ${email}...`)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        created_from: 'edge_function',
        recreated: true,
        recreated_at: new Date().toISOString()
      }
    })

    if (createError) {
      console.error('❌ Erreur createUser:', createError.message)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: responseHeaders
      })
    }

    if (!newUser) {
      return new Response(JSON.stringify({ error: 'Utilisateur créé mais aucune donnée retournée' }), {
        status: 500,
        headers: responseHeaders
      })
    }

    // ✅ 4. Envoie email de réinitialisation si demandé
    if (redirectTo) {
      console.log(`✉️ Envoi recovery vers ${redirectTo}`)
      const { error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo }
      })

      if (recoveryError) {
        console.warn('⚠️ Erreur generateLink:', recoveryError.message)
        // Pas bloquant
      }
    }

    // ✅ 5. Retourne la réponse
    return new Response(JSON.stringify({
      success: true,
      user: newUser,
      message: `✅ Utilisateur ${email} recréé avec succès`
    }), {
      status: 200,
      headers: responseHeaders
    })

  } catch (err: any) {
    console.error('🔥 Erreur inattendue:', err.message || err)
    return new Response(JSON.stringify({ error: err.message || 'Erreur inconnue' }), {
      status: 500,
      headers: responseHeaders
    })
  }
})
