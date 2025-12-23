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

    const tempPassword = generateTempPassword()
    console.log(`🔑 Temporary password for ${partner.contact_email}: ${tempPassword}`)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: partner.contact_email,
      password: tempPassword,
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

    const userId = authData.user.id

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: userId,
        first_name: partner.contact_name?.split(' ')[0] || '',
        last_name: partner.contact_name?.split(' ').slice(1).join(' ') || '',
        email: partner.contact_email,
        phone: partner.phone || null,
        is_admin: false,
        partner_id: partnerId
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: 'Failed to create user profile', details: profileError }), {
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
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('user_profiles').delete().eq('user_id', userId)
      return new Response(JSON.stringify({ error: 'Failed to update partner', details: updateError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const loginUrl = `${Deno.env.get('SITE_URL') || 'https://nowme.club'}/login`

    const emailContent = `
      <h2>Félicitations ! Votre partenariat Nowme est approuvé 🎉</h2>
      <p>Bonjour ${partner.contact_name},</p>
      <p>Nous sommes ravis de vous informer que votre demande de partenariat pour <strong>${partner.business_name}</strong> a été approuvée !</p>
      
      <h3>Vos identifiants de connexion :</h3>
      <ul>
        <li><strong>Email :</strong> ${partner.contact_email}</li>
        <li><strong>Mot de passe temporaire :</strong> ${tempPassword}</li>
      </ul>
      
      <p><strong>⚠️ Important :</strong> Pour des raisons de sécurité, veuillez changer votre mot de passe lors de votre première connexion.</p>
      
      <p><a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #E91E63; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">Se connecter à mon espace partenaire</a></p>
      
      <h3>Prochaines étapes :</h3>
      <ol>
        <li>Connectez-vous à votre espace partenaire</li>
        <li>Complétez votre profil</li>
        <li>Créez vos premières offres exclusives</li>
      </ol>
      
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>À très bientôt sur Nowme !</p>
      <p>L'équipe Nowme</p>
    `

    await supabaseAdmin
      .from('emails')
      .insert({
        to_address: partner.contact_email,
        subject: 'Votre partenariat Nowme est approuvé ! 🎉',
        content: emailContent,
        status: 'pending'
      })

    return new Response(
      JSON.stringify({
        success: true,
        partner: updatedPartner,
        tempPassword
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
