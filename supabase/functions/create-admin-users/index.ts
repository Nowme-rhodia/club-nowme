import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AdminUser {
  email: string
  password: string
  role: 'super_admin' | 'subscriber_admin' | 'partner_admin'
  permissions: string[]
}

const adminUsers: AdminUser[] = [
  {
    email: 'rhodia@nowme.fr',
    password: 'azert123',
    role: 'super_admin',
    permissions: ['all']
  },
  {
    email: 'nowme.club@gmail.com', 
    password: 'azert123',
    role: 'subscriber_admin',
    permissions: ['subscribers', 'newsletter', 'events', 'masterclasses']
  },
  {
    email: 'rhodia.kw@gmail.com',
    password: 'azert123', 
    role: 'partner_admin',
    permissions: ['partners', 'offers', 'bookings']
  }
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    console.log('🚀 Création des utilisateurs admin...')
    const results = []

    for (const adminUser of adminUsers) {
      try {
        console.log(`📝 Création de ${adminUser.email} (${adminUser.role})...`)

        // 1. Vérifier si l'utilisateur existe déjà
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(adminUser.email)
        
        if (existingUser?.user) {
          console.log(`⚠️ Utilisateur ${adminUser.email} existe déjà, suppression...`)
          await supabase.auth.admin.deleteUser(existingUser.user.id, true)
        }

        // 2. Créer l'utilisateur dans auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: adminUser.email,
          password: adminUser.password,
          email_confirm: true,
          user_metadata: {
            role: adminUser.role,
            permissions: adminUser.permissions,
            created_by: 'admin_setup'
          }
        })

        if (authError) throw authError

        console.log(`✅ Utilisateur auth créé: ${authUser.user.id}`)

        // 3. Créer le profil utilisateur
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: crypto.randomUUID(),
            user_id: authUser.user.id,
            email: adminUser.email,
            first_name: adminUser.email === 'rhodia@nowme.fr' ? 'Rhodia' : 
                       adminUser.email === 'nowme.club@gmail.com' ? 'Admin' : 'Rhodia',
            last_name: adminUser.email === 'rhodia@nowme.fr' ? 'Admin' : 
                      adminUser.email === 'nowme.club@gmail.com' ? 'Subscribers' : 'Partners',
            subscription_status: 'active',
            subscription_type: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError) throw profileError

        console.log(`✅ Profil créé pour ${adminUser.email}`)

        // 4. Créer les récompenses membre
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', authUser.user.id)
          .single()

        if (profile) {
          const { error: rewardsError } = await supabase
            .from('member_rewards')
            .insert({
              user_id: profile.id,
              points_earned: 0,
              points_spent: 0,
              points_balance: 0,
              tier_level: 'platinum',
              created_at: new Date().toISOString()
            })

          if (rewardsError) {
            console.warn(`⚠️ Erreur création récompenses pour ${adminUser.email}:`, rewardsError)
          } else {
            console.log(`✅ Récompenses créées pour ${adminUser.email}`)
          }
        }

        results.push({
          email: adminUser.email,
          role: adminUser.role,
          permissions: adminUser.permissions,
          success: true,
          userId: authUser.user.id
        })

      } catch (error) {
        console.error(`❌ Erreur pour ${adminUser.email}:`, error)
        results.push({
          email: adminUser.email,
          role: adminUser.role,
          success: false,
          error: error.message
        })
      }
    }

    // 5. Résumé des créations
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    console.log(`\n📊 Résumé:`)
    console.log(`✅ Créés avec succès: ${successful.length}`)
    console.log(`❌ Échecs: ${failed.length}`)

    if (successful.length > 0) {
      console.log(`\n🎯 Utilisateurs créés:`)
      successful.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`)
      })
    }

    if (failed.length > 0) {
      console.log(`\n⚠️ Échecs:`)
      failed.forEach(user => {
        console.log(`  - ${user.email}: ${user.error}`)
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${successful.length} utilisateurs admin créés avec succès`,
      results,
      summary: {
        total: adminUsers.length,
        successful: successful.length,
        failed: failed.length
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erreur générale:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})