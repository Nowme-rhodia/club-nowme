import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=denonext"
import Stripe from "https://esm.sh/stripe@17.5.0?target=denonext"
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

    let generatedReferralCode = partner.referral_code;

    // Si c'est une créatrice et qu'elle n'a pas de code promo, on en crée un + on le pousse sur Stripe
    if (partner.is_creator && !generatedReferralCode) {
      generatedReferralCode = await generateUniqueReferralCode(supabaseAdmin);

      try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
          apiVersion: '2023-10-16',
          httpClient: Stripe.createFetchHttpClient(),
        });

        // Verifier/Créer le coupon de base (10% de réduction 1 mois)
        const couponId = 'CREATOR_10_OFF_1M';
        try {
          await stripe.coupons.retrieve(couponId);
        } catch (err: any) {
          if (err.statusCode === 404) {
            console.log('Création du coupon de base pour créatrices...');
            await stripe.coupons.create({
              id: couponId,
              name: 'Remise Partenaire (-10% sur le 1er mois)',
              percent_off: 10,
              duration: 'once',
            });
          } else {
            console.error('Erreur Stripe silencieuse (coupon) :', err);
          }
        }

        // Créer la promotion liée à ce code pour qu'il soit utilisable au checkout
        await stripe.promotionCodes.create({
          coupon: couponId,
          code: generatedReferralCode,
          metadata: {
            partner_id: partnerId
          }
        });

        console.log(`Code Promo Stripe ${generatedReferralCode} créé avec succès.`);
      } catch (stripeError) {
        console.error('Erreur lors de la création du code Stripe :', stripeError);
        // On ne bloque pas l'update en DB si Stripe échoue, mais on laisse une trace
      }
    }

    const { data: updatedPartner, error: updateError } = await supabaseAdmin
      .from('partners')
      .update({
        status: 'approved',
        admin_notes: adminNotes ?? null,
        referral_code: generatedReferralCode
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

    // Format commission terms for email
    let commissionTermsHtml = '';
    const model = partner.commission_model || 'fixed';
    const rate = partner.commission_rate || 0;
    const rateRepeat = partner.commission_rate_repeat || 0;

    if (model === 'acquisition') {
      commissionTermsHtml = `
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Vos Conditions de Partenariat</h3>
                <p style="margin-bottom: 8px;"><strong>Modèle :</strong> Acquisition & Fidélisation</p>
                <ul style="padding-left: 20px; margin: 0;">
                    <li><strong>${rate}%</strong> de commission sur le 1er achat (Acquisition)</li>
                    <li><strong>${rateRepeat}%</strong> de commission sur les achats suivants (Gestion)</li>
                </ul>
            </div>
        `;
    } else {
      commissionTermsHtml = `
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Vos Conditions de Partenariat</h3>
                <p style="margin-bottom: 8px;"><strong>Modèle :</strong> Commission Fixe</p>
                <ul style="padding-left: 20px; margin: 0;">
                    <li><strong>${rate}%</strong> de commission sur toutes les transactions</li>
                </ul>
            </div>
        `;
    }

    if (updatedPartner?.referral_code) {
      commissionTermsHtml += `
            <div style="background-color: #fce4ec; border: 2px dashed #e91e63; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
                <h3 style="margin-top: 0; color: #e91e63;">Votre Code Partenaire Unique 🎟️</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 8px 0; letter-spacing: 2px;">${updatedPartner.referral_code}</p>
                <p style="font-size: 14px; color: #666; margin: 0;">Offre -10% à vos abonnées sur leur 1er mois.</p>
            </div>
      `;
    }

    const commonSteps = `
        <h3>Prochaine étape obligatoire : Signature du Contrat ✍️</h3>
        <p>Pour activer définitivement votre compte et accéder à votre tableau de bord, vous devez signer électroniquement votre mandat de gestion.</p>
        <p>Cela se fait en un clic lors de votre première connexion.</p>
    `;

    let emailContent = ''

    if (isNewUser) {
      emailContent = `
        <h2>Félicitations ! Votre candidature est pré-approuvée 🔑</h2>
        <p>Bonjour ${partner.contact_name},</p>
        <p>L'équipe Nowme a validé votre profil pour <strong>${partner.business_name}</strong>.</p>
        
        ${commissionTermsHtml}
        
        ${commonSteps}
        
        <p>Cliquez ci-dessous pour créer votre mot de passe, signer votre contrat et commencer :</p>
        
        <p><a href="${recoveryLink}" style="display: inline-block; padding: 12px 24px; background-color: #E91E63; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">Activer mon compte et Signer</a></p>
        
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>À très bientôt sur Nowme !</p>
        <p>L'équipe Nowme</p>
      `
    } else {
      emailContent = `
        <h2>Félicitations ! Votre candidature est pré-approuvée 🔑</h2>
        <p>Bonjour ${partner.contact_name},</p>
        <p>L'équipe Nowme a validé votre profil pour <strong>${partner.business_name}</strong>.</p>
        
        ${commissionTermsHtml}
        
        ${commonSteps}

        <p>Connectez-vous pour signer le mandat et débloquer votre espace partenaire :</p>

        <p><a href="${signInUrl}" style="display: inline-block; padding: 12px 24px; background-color: #E91E63; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">Accéder à mon espace et Signer</a></p>
        
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

async function generateUniqueReferralCode(supabase: any): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    // Generate 3 random chars after KIF
    let suffix = '';
    for (let i = 0; i < 3; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `KIF${suffix}`;

    const { data } = await supabase
      .from('partners')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();

    if (!data) isUnique = true;
  }

  return code;
}
