import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { email, authUserId, role } = await req.json()
    if (!email || !authUserId || !role) {
      throw new Error('Email, authUserId et role requis')
    }

    console.info('🚀 link-auth-to-profile v2025-09-24-single-table')
    const now = new Date().toISOString()

    // --- CAS 1 : SUBSCRIBER ---
    if (role === 'subscriber') {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', authUserId)
        .maybeSingle()

      const { data: profile, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            email,
            user_id: authUserId,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        )
        .select('id, user_id')
        .single()

      if (upsertError) throw upsertError
      const wasCreated = !existingProfile

      // Rewards uniquement pour les abonnés
      const { data: reward } = await supabase
        .from('member_rewards')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (!reward) {
        await supabase.from('member_rewards').insert({
          user_id: profile.id,
          points_earned: 0,
          points_spent: 0,
          points_balance: 0,
          tier_level: 'platinum',
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'subscriber',
          profileId: profile.id,
          authUserId: profile.user_id,
        }),
        {
          status: wasCreated ? 201 : 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // --- CAS 2 : PARTNER ---
    if (role === 'partner') {
      const { data: existingPartner } = await supabase
        .from('partners')
        .select('id, status, email')
        .eq('user_id', authUserId)
        .maybeSingle()

      const { data: partner, error: upsertError } = await supabase
        .from('partners')
        .upsert(
          {
            email,
            user_id: authUserId,
            business_name: null,
            contact_name: null,
            phone: null,
            contact_email: email,
            status: existingPartner?.status || 'pending',
            updated_at: now,
          },
          { onConflict: 'user_id' }
        )
        .select('id, user_id, status, email, contact_name')
        .single()

      if (upsertError) throw upsertError
      const wasCreated = !existingPartner

      // 🔔 Nouvel enregistrement → email automatique
      if (wasCreated && partner?.email) {
        try {
          await fetch(`${Deno.env.get('RESEND_API_URL')}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            },
            body: JSON.stringify({
              to: partner.email,
              subject: 'Votre demande de partenariat a bien été reçue',
              content: `
                Bonjour ${partner.contact_name ?? ''},

                Merci d’avoir soumis votre demande de partenariat à Nowme Club 💫

                Votre demande est en cours de vérification par notre équipe.
                Vous recevrez un email dès qu’elle sera validée ou si nous avons besoin d’informations complémentaires.

                L’équipe Nowme Club
              `,
            }),
          })
          console.info('📧 Email de confirmation envoyé à', partner.email)
        } catch (err) {
          console.error('❌ Erreur envoi email confirmation partner:', err)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'partner',
          partnerId: partner.id,
          authUserId: partner.user_id,
          status: partner.status,
        }),
        {
          status: wasCreated ? 201 : 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // --- CAS 3 : ADMIN ---
    if (role === 'admin') {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', authUserId)
        .maybeSingle()

      const { data: profile, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            email,
            user_id: authUserId,
            is_admin: true,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        )
        .select('id, user_id')
        .single()

      if (upsertError) throw upsertError
      const wasCreated = !existingProfile

      return new Response(
        JSON.stringify({
          success: true,
          type: 'admin',
          profileId: profile.id,
          authUserId: profile.user_id,
        }),
        {
          status: wasCreated ? 201 : 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    throw new Error(`Role ${role} non supporté`)
  } catch (error) {
    console.error('❌ Erreur liaison profil:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error?.message || error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
