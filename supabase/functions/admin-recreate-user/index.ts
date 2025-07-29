// admin-recreate-user.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, redirectTo } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email et mot de passe requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Vérifie si l'utilisateur existe dans auth.users
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .execute({ schema: 'auth' })

    if (existingUsers && existingUsers.length > 0) {
      const userId = existingUsers[0].id
      await supabase.rpc('delete_user_completely', { user_id: userId })
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      email_redirect_to: redirectTo ?? 'https://club.nowme.fr/auth/update-password',
      user_metadata: {
        created_from: 'edge_function',
        recreated: true,
        recreated_at: new Date().toISOString()
      }
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Utilisateur recréé avec succès',
      user: newUser
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
