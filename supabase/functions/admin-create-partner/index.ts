import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

        // Verify admin authorization
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

        const { business_name, contact_name, contact_email, phone, description } = await req.json()

        // Validate required fields
        if (!business_name || !contact_name || !contact_email) {
            return new Response(JSON.stringify({ error: 'Missing required fields: business_name, contact_name, contact_email' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Check if partner email already exists
        const { data: existingPartner } = await supabaseAdmin
            .from('partners')
            .select('id, contact_email')
            .eq('contact_email', contact_email)
            .single()

        if (existingPartner) {
            return new Response(JSON.stringify({ error: 'Un partenaire avec cet email existe déjà' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Check if user already exists
        const { data: existingUserId } = await supabaseAdmin.rpc('get_user_id_by_email', {
            user_email: contact_email
        })

        let userId = existingUserId as string | null
        let recoveryLink = ''
        let isNewUser = false

        if (!userId) {
            isNewUser = true
            const backendPassword = generateTempPassword()

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: contact_email,
                password: backendPassword,
                email_confirm: true,
                user_metadata: {
                    first_name: contact_name?.split(' ')[0] || '',
                    last_name: contact_name?.split(' ').slice(1).join(' ') || ''
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
        }

        // Create partner record with approved status
        const { data: newPartner, error: partnerError } = await supabaseAdmin
            .from('partners')
            .insert({
                business_name,
                contact_name,
                contact_email,
                phone: phone || null,
                description: description || null,
                status: 'approved', // Directly approved since created by admin
                admin_notes: 'Créé directement par un administrateur'
            })
            .select('*')
            .single()

        if (partnerError || !newPartner) {
            console.error('Error creating partner:', partnerError)
            if (isNewUser) {
                await supabaseAdmin.auth.admin.deleteUser(userId!)
            }
            return new Response(JSON.stringify({ error: 'Failed to create partner', details: partnerError }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Generate Recovery Link for password setup
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: contact_email,
            options: {
                redirectTo: `${Deno.env.get('SITE_URL') || 'https://club.nowme.fr'}/update-password`
            }
        })

        if (linkError || !linkData.properties?.action_link) {
            console.error('Error generating link:', linkError)
            return new Response(JSON.stringify({ error: 'Failed to generate access link', details: linkError }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }
        recoveryLink = linkData.properties.action_link

        // Link user profile to partner
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                user_id: userId,
                first_name: contact_name?.split(' ')[0] || '',
                last_name: contact_name?.split(' ').slice(1).join(' ') || '',
                email: contact_email,
                phone: phone || null,
                partner_id: newPartner.id
            }, { onConflict: 'user_id' })

        if (profileError) {
            console.error('Error updating/creating profile:', profileError)
            // Rollback
            await supabaseAdmin.from('partners').delete().eq('id', newPartner.id)
            if (isNewUser) {
                await supabaseAdmin.auth.admin.deleteUser(userId!)
            }
            return new Response(JSON.stringify({ error: 'Failed to link user profile', details: profileError }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Send welcome email with credentials
        const emailContent = `
      <h2>Bienvenue sur Nowme ! Votre compte partenaire est prêt 🎉</h2>
      <p>Bonjour ${contact_name},</p>
      <p>Un administrateur Nowme a créé un compte partenaire pour <strong>${business_name}</strong>.</p>
      
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Vos informations de connexion</h3>
        <p><strong>Email :</strong> ${contact_email}</p>
        <p style="color: #6b7280; font-size: 14px;">Vous devez créer votre mot de passe en cliquant sur le bouton ci-dessous.</p>
      </div>
      
      <h3>Prochaines étapes :</h3>
      <ol>
        <li>Créez votre mot de passe</li>
        <li>Signez électroniquement votre mandat de gestion</li>
        <li>Accédez à votre tableau de bord partenaire</li>
      </ol>
      
      <p><a href="${recoveryLink}" style="display: inline-block; padding: 12px 24px; background-color: #E91E63; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">Créer mon mot de passe et commencer</a></p>
      
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>À très bientôt sur Nowme !</p>
      <p>L'équipe Nowme</p>
    `

        // Send email via Resend
        let emailResult = { success: false, error: null }

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
                    to: contact_email,
                    subject: 'Bienvenue sur Nowme ! Votre compte partenaire est prêt 🎉',
                    html: emailContent,
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                console.error('Resend API Error:', errorData)
                emailResult = { success: false, error: errorData }
            } else {
                console.log('✅ Welcome email sent to', contact_email)
                emailResult = { success: true, error: null }
            }
        } catch (emailErr: any) {
            console.error('Failed to send welcome email:', emailErr)
            emailResult = { success: false, error: emailErr.message }
        }

        // Log email in database
        await supabaseAdmin
            .from('emails')
            .insert({
                to_address: contact_email,
                subject: 'Bienvenue sur Nowme ! Votre compte partenaire est prêt 🎉',
                content: emailContent,
                status: emailResult.success ? 'sent' : 'failed',
                sent_at: emailResult.success ? new Date().toISOString() : null
            })

        return new Response(
            JSON.stringify({
                success: true,
                partner: newPartner,
                emailSent: emailResult.success
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
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
