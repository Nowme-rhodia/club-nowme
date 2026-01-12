import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { partnerId, adminNotes } = await req.json()

    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single()

    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: 'Partner not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user already exists
    // We use an RPC call because listUsers() was failing with a recursive DB error
    const { data: existingUserId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_email', {
      user_email: partner.contact_email
    })

    if (rpcError) {
      console.error('Error checking existing user via RPC:', rpcError)
      return new Response(JSON.stringify({ error: 'Failed to check existing users', details: rpcError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let userId = existingUserId as string | null
    let recoveryLink = ''
    let isNewUser = false

    if (!userId) {
      isNewUser = true
      // Create user without password (will set via recovery link)
      // Or create with random password but send link.
      // generateLink type 'recovery' works for existing users.
      // For new users, we might want 'invite' or just create + recovery.
      // Let's create with random password (backend only) and send recovery link.
      const backendPassword = generateTempPassword()

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: partner.contact_email,
        password: backendPassword,
        email_confirm: true,
        user_metadata: {
          first_name: partner.contact_name?.split(' ')[0] || '',
          last_name: partner.contact_name?.split(' ').slice(1).join(' ') || ''
        }
      })

      if (authError || !authData.user) {
        console.error('Error creating user:', authError)
        return new Response(JSON.stringify({ error: 'Failed to create user account', details: authError }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = authData.user.id
    } else {
      console.log(`👤 User already exists for ${partner.contact_email} (ID: ${userId})`)
    }

    // Generate Recovery Link (Magic Link / Reset Password)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: partner.contact_email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://club.nowme.fr'}/update-password`
      }
    })

    if (linkError || !linkData.properties?.action_link) {
      console.error('Error generating link:', linkError)
      // Fallback or error? Let's error for now as this is critical.
      return new Response(JSON.stringify({ error: 'Failed to generate access link', details: linkError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    recoveryLink = linkData.properties.action_link

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        first_name: partner.contact_name?.split(' ')[0] || '',
        last_name: partner.contact_name?.split(' ').slice(1).join(' ') || '',
        email: partner.contact_email,
        phone: partner.phone || null,
        // Don't overwrite is_admin if it's already true (e.g. for the owner)
        // But for a normal partner we want is_admin: false usually. 
        // We'll trust the existing value or default to false.
        // Actually upsert merges, but we should be careful. 
        // Let's just update the partner_id and basic info.
        partner_id: partnerId
      }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Error updating/creating profile:', profileError)
      // Only delete if we just created it
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId!)
      }
      return new Response(JSON.stringify({ error: 'Failed to link user profile', details: profileError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: updatedPartner, error: updateError } = await supabaseAdmin
      .from('partners')
      .update({
        status: 'approved',
        admin_notes: adminNotes ?? null
      })
      .eq('id', partnerId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating partner:', updateError)
      // Only rollback user creation if we created a new one
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId!)
        await supabaseAdmin.from('user_profiles').delete().eq('user_id', userId)
      }
      return new Response(JSON.stringify({ error: 'Failed to update partner', details: updateError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const signInUrl = `${Deno.env.get('SITE_URL') || 'https://club.nowme.fr'}/connexion`

    let emailContent = ''

    if (isNewUser) {
      emailContent = `
        <h2>Félicitations ! Votre espace Partenaire Nowme est prêt 🔑</h2>
        <p>Bonjour ${partner.contact_name},</p>
        <p>Nous sommes ravis de vous informer que votre demande de partenariat pour <strong>${partner.business_name}</strong> a été approuvée !</p>
        
        <p>Nous sommes ravis de vous compter parmi nous. Cliquez ci-dessous pour configurer votre mot de passe et accéder à votre dashboard.</p>
        
        <p><a href="${recoveryLink}" style="display: inline-block; padding: 12px 24px; background-color: #E91E63; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">Configurer mon mot de passe et accéder à mon espace</a></p>
        
        <h3>Prochaines étapes :</h3>
        <ol>
          <li>Complétez votre profil</li>
          <li>Créez vos premières offres exclusives</li>
        </ol>
        
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>À très bientôt sur Nowme !</p>
        <p>L'équipe Nowme</p>
      `
    } else {
      emailContent = `
        <h2>Félicitations ! Votre espace Partenaire Nowme est prêt 🔑</h2>
        <p>Bonjour ${partner.contact_name},</p>
        <p>Nous sommes ravis de vous informer que votre demande de partenariat pour <strong>${partner.business_name}</strong> a été approuvée !</p>
        
        <p>Il semble que vous ayez déjà un compte sur Nowme. Nous avons mis à jour vos droits pour vous donner accès à l'espace partenaire.</p>

        <p>Vous pouvez utiliser le lien ci-dessous pour accéder directement à votre espace :</p>

        <p><a href="${signInUrl}" style="display: inline-block; padding: 12px 24px; background-color: #E91E63; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">Accéder à mon espace partenaire</a></p>
        
        <h3>Prochaines étapes :</h3>
        <ol>
          <li>Complétez votre profil et créez vos offres</li>
        </ol>
        
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>À très bientôt sur Nowme !</p>
        <p>L'équipe Nowme</p>
      `
    }

    // Send email directly via Resend to avoid queue issues
    let emailResult = { success: false, error: null };

    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        throw new Error('Missing RESEND_API_KEY')
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'Nowme Club <contact@nowme.fr>',
          to: partner.contact_email,
          subject: 'Félicitations ! Votre espace Partenaire Nowme est prêt 🔑',
          html: emailContent,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('Resend API Error:', errorData)
        emailResult = { success: false, error: errorData }
      } else {
        console.log('✅ Approval email sent directly to', partner.contact_email)
        emailResult = { success: true, error: null }
      }
    } catch (emailErr: any) {
      console.error('Failed to send approval email:', emailErr)
      emailResult = { success: false, error: emailErr.message }
    }

    // Keep the email record for history/logging purposes, but mark as sent?
    await supabaseAdmin
      .from('emails')
      .insert({
        to_address: partner.contact_email,
        subject: 'Félicitations ! Votre espace Partenaire Nowme est prêt 🔑',
        content: emailContent,
        status: emailResult.success ? 'sent' : 'failed',
        sent_at: emailResult.success ? new Date().toISOString() : null
      })

    return new Response(
      JSON.stringify({
        success: true,
        partner: updatedPartner,
        emailDebug: {
          partnerEmail: partner.contact_email,
          sent: emailResult.success,
          error: emailResult.error
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function generateTempPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}
