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
    const { email, authUserId, role, plan } = await req.json()
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
            selected_plan: plan || null // Capture plan if provided
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
      const { businessName, contactName, phone } = await req.json()

      // 1. Upsert du profil utilisateur pour s'assurer qu'il existe
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: authUserId,
            email,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (profileError) throw profileError

      let partnerId = profile.partner_id
      let wasCreated = false
      let partnerData = null

      if (partnerId) {
        console.info('✅ User already linked to partner:', partnerId)
        // Retrieve partner data for response
        const { data } = await supabase.from('partners').select('*').eq('id', partnerId).maybeSingle()
        partnerData = data
      } else {
        // 2. Chercher candidature existante par email
        const { data: existingByEmail } = await supabase
          .from('partners')
          .select('*')
          .eq('contact_email', email)
          .maybeSingle()

        let targetPartnerId = null

        if (existingByEmail) {
          // Vérifier si ce partenaire est déjà lié à un AUTRE profil
          const { data: linkedProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('partner_id', existingByEmail.id)
            .neq('user_id', authUserId)
            .maybeSingle()

          if (!linkedProfile) {
            console.info('🔗 Linking existing partner application:', existingByEmail.id)
            targetPartnerId = existingByEmail.id

            // Update partner details
            await supabase.from('partners').update({
              business_name: businessName || existingByEmail.business_name,
              contact_name: contactName || existingByEmail.contact_name,
              phone: phone || existingByEmail.phone,
              updated_at: now
            }).eq('id', targetPartnerId)

            partnerData = existingByEmail
          }
        }

        if (!targetPartnerId) {
          console.info('✨ Creating new partner')
          const { data: newPartner, error: insertError } = await supabase
            .from('partners')
            .insert({
              contact_email: email,
              email: email,
              business_name: businessName,
              contact_name: contactName,
              phone: phone,
              status: 'pending',
              updated_at: now,
            })
            .select()
            .single()

          if (insertError) throw insertError
          targetPartnerId = newPartner.id
          partnerData = newPartner
          wasCreated = true
        }

        // 3. Link user_profile to partner
        const { error: linkError } = await supabase
          .from('user_profiles')
          .update({ partner_id: targetPartnerId })
          .eq('user_id', authUserId)

        if (linkError) throw linkError
        partnerId = targetPartnerId
      }

      if (!partnerId) throw new Error('Failed to create or link partner')

      // 🔔 Nouvel enregistrement (création pure) → email automatique
      if (wasCreated && partnerData?.contact_email) {
        try {
          await fetch(`${Deno.env.get('RESEND_API_URL')}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            },
            body: JSON.stringify({
              to: partnerData.contact_email,
              subject: 'Votre compte partenaire est créé ! 🚀',
              content: `
                Bonjour ${partnerData.contact_name ?? ''},

                Votre compte partenaire a bien été créé. 
                Vous pouvez désormais vous connecter à votre espace partenaire.

                L’équipe Nowme Club
              `,
            }),
          })
          console.info('📧 Email de confirmation envoyé à', partnerData.contact_email)
        } catch (err) {
          console.error('❌ Erreur envoi email confirmation partner:', err)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'partner',
          partnerId: partnerId,
          authUserId: profile.user_id,
          status: partnerData?.status || 'pending',
        }),
        {
          status: 200,
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
