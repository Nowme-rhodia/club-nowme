// supabase/functions/admin-recreate-user.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { email, password, role, redirectTo } = await req.json()
    if (!email || !password) throw new Error('Email et mot de passe requis')

    console.log(`🔄 Création utilisateur: ${email} avec rôle: ${role}`)

    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email)
    if (existingUser) {
      console.log(`🗑️ Suppression utilisateur existant: ${email}`)
      await supabase.auth.admin.deleteUser(existingUser.id, true)
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        recreated: true,
        role: role || 'user',
        created_by: 'admin_setup'
      }
    })

    if (createError) throw createError
    console.log(`✅ Utilisateur auth créé: ${newUser.user.id}`)

    // Créer le profil utilisateur avec le bon rôle
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: crypto.randomUUID(),
        user_id: newUser.user.id,
        email: email,
        first_name: email === 'rhodia@nowme.fr' ? 'Rhodia' : 
                   email === 'nowme.club@gmail.com' ? 'Admin' : 'Rhodia',
        last_name: email === 'rhodia@nowme.fr' ? 'Super' : 
                  email === 'nowme.club@gmail.com' ? 'Subscribers' : 'Partners',
        subscription_status: 'active',
        subscription_type: role === 'super_admin' ? 'admin' : role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('❌ Erreur création profil:', profileError)
      throw new Error(`Erreur création profil: ${profileError.message}`)
    }
    console.log(`✅ Profil créé pour ${email}`)

    if (redirectTo) {
      await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo }
      })
      console.log(`📧 Lien de récupération généré pour ${email}`)
    }

    return new Response(JSON.stringify({ 
      user: newUser, 
      success: true,
      role: role,
      message: `Utilisateur ${email} créé avec rôle ${role}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('❌ Erreur création utilisateur:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
