
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=denonext";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    );

    // 1. Verify User is Admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization Header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid Token');
    }

    // Check capability
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile || !profile.is_admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admins only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Get Target User ID & Role
    let { userId, partnerId, role, action, reason } = await req.json();
    // reason: 'user_request' | 'violation' | 'other'

    // If deleting a partner, we might interpret 'userId' as 'partnerId' from frontend, or explicit 'partnerId'
    if (role === 'partner' && (!userId || userId === partnerId)) {
      // Try to resolve real userId via user_profiles using partner_id
      // The frontend currently sends partner.id as userId. 
      // We can treat the input userId as partnerId if we can't find the user, or just always check if it's a partner.
      // Better: Explicitly check for partner_id link.

      const effectivePartnerId = partnerId || userId;
      console.log(`🔍 Resolving User ID for Partner ID: ${effectivePartnerId}`);

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('partner_id', effectivePartnerId)
        .single();

      if (profile && profile.user_id) {
        userId = profile.user_id;
        console.log(`✅ Resolved User ID: ${userId}`);
      } else {
        console.warn(`⚠️ Could not resolve User ID from Partner ID ${effectivePartnerId}. Proceeding with original ID (might fail).`);
      }
    }

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log(`🗑️ Admin ${user.email} is performing ${action || 'delete'} on ${userId} (Role: ${role}, Reason: ${reason})`);

    // PREVENT SELF-DELETION
    if (userId === user.id) {
      throw new Error("You cannot nuke yourself!");
    }

    // --- 2.5 SEND NOTIFICATION EMAIL ---
    try {
      // Fetch user email to send notification
      const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (targetUser && targetUser.user && targetUser.user.email) {
        const userEmail = targetUser.user.email;
        const userName = targetUser.user.user_metadata?.first_name || 'Kiffeuse';

        console.log(`📧 Sending email to ${userEmail} (Reason: ${reason})...`);

        let subject = "";
        let htmlContent = "";

        // --- EMAIL TEMPLATES ---
        if (reason === 'violation') {
          // VIOLATION / BANNISSEMENT
          subject = "⚠️ Important : Suspension de votre compte Nowme";
          htmlContent = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #EF4444;">Compte suspendu</h1>
                    <p>Bonjour ${userName},</p>
                    <p>Nous vous informons que votre compte Nowme a été suspendu et archivé suite au non-respect de nos conditions d'utilisation ou de la charte de la communauté.</p>
                    <p>Vous ne pouvez plus accéder à votre espace personnel ni aux événements.</p>
                    <p>Si vous pensez qu'il s'agit d'une erreur, vous pouvez nous contacter à <a href="mailto:contact@nowme.fr">contact@nowme.fr</a>.</p>
                    <br/>
                    <p>Cordialement,</p>
                    <p><strong>L'équipe Modération Nowme</strong></p>
                </div>
            `;
        } else if (reason === 'other') {
          // AUTRE / GENERIC
          subject = "Information concernant votre compte Nowme";
          htmlContent = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">Fermeture de compte</h1>
                    <p>Bonjour ${userName},</p>
                    <p>Votre compte Nowme a été clôturé et archivé ce jour.</p>
                    <p>Vos données personnelles ont été traitées conformément à notre politique de confidentialité.</p>
                    <br/>
                    <p>Bien à vous,</p>
                    <p><strong>L'équipe Nowme</strong></p>
                </div>
            `;
        } else {
          // USER REQUEST (Benevolent Default)
          if (role === 'partner') {
            subject = "Au revoir, et merci pour ce bout de chemin ensemble ✨";
            htmlContent = `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #D946EF;">Au revoir ${userName} 👋</h1>
                        <p>Nous vous confirmons la suppression de votre accès partenaire Nowme.</p>
                        <p>Nous tenions à vous remercier pour l'énergie et les moments partagés avec la communauté.</p>
                        <p>Sachez que vous serez toujours la bienvenue si vos chemins venaient à recroiser les nôtres.</p>
                        <p>Nous vous souhaitons une magnifique continuation, remplie de succès et de kiffs !</p>
                        <br/>
                        <p>Avec toute notre bienveillance,</p>
                        <p><strong>L'équipe Nowme</strong></p>
                    </div>
                `;
          } else {
            subject = "Ce n'est qu'un au revoir... ✨";
            htmlContent = `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #D946EF;">Tu vas nous manquer ${userName} 💖</h1>
                        <p>Nous avons bien pris en compte la suppression de ton compte Nowme.</p>
                        <p>Toutes tes données, réservations et créations ont été effacées, comme tu l'as souhaité.</p>
                        <p>Merci d'avoir fait partie de l'aventure. Nous espérons que tu as pu vivre de beaux moments de connexion et de découverte.</p>
                        <p>La porte reste toujours ouverte si tu souhaites revenir kiffer avec nous un jour.</p>
                        <p>Prends grand soin de toi !</p>
                        <br/>
                        <p>Avec toute notre affection,</p>
                        <p><strong>La Team Nowme</strong></p>
                    </div>
                `;
          }
        }

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (RESEND_API_KEY) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: 'Nowme <contact@nowme.fr>',
              to: [userEmail],
              subject: subject,
              html: htmlContent
            })
          });

          if (!res.ok) {
            console.error('Failed to send email:', await res.text());
          } else {
            console.log('✅ Goodbye email sent.');
          }
        } else {
          console.warn('⚠️ RESEND_API_KEY missing, skipping email.');
        }

      } else {
        console.warn('Could not find user email for notification.');
      }

    } catch (emailErr) {
      console.error('Error in email notification block (proceeding to delete anyway):', emailErr);
    }
    // ------------------------------

    // 3. Perform Deletions
    // A. Manually delete Events/Squads created by this user to avoid orphans if no cascade
    // (Assuming 'micro_squads' or 'events' table exists and has 'organizer_id' or similar)
    // We'll try a generic cleanup of known tables where they might be a creator.

    // Cleanup Micro Squads created by user
    const { error: squadError } = await supabaseAdmin
      .from('micro_squads')
      .delete()
      .eq('creator_id', userId);

    if (squadError) console.warn('Warning deleting squads:', squadError);

    // Cleanup Events (if any)
    const { error: eventError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('organizer_id', userId);

    if (eventError) console.warn('Warning deleting events:', eventError);

    // B. Delete from Auth (This usually cascades to profile if set up, otherwise we delete profile manually)

    if (role === 'partner') {
      // ... Partner Archiving/Deletion Logic (Existing) ...
      // Let's delete profile explicitly first just in case (For PARTNERS only if deleting)

      const partnerIdToDelete = partnerId || userId;
      if (partnerIdToDelete) {

        if (action === 'archive') {
          // Archive Partner
          console.log(`📦 Archiving partner record: ${partnerIdToDelete}`);
          await supabaseAdmin.from('partners').update({ status: 'archived' }).eq('id', partnerIdToDelete);
          // Delete Auth/Profile for partner (as requested previously)
          await supabaseAdmin.from('user_profiles').delete().eq('user_id', userId);
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } else {
          // Delete Partner
          console.log(`🗑️ Deleting partner record: ${partnerIdToDelete}`);
          await supabaseAdmin.from('user_profiles').delete().eq('user_id', userId);
          await supabaseAdmin.from('partners').delete().eq('id', partnerIdToDelete);
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
      }
    } else {
      // ... SUBSCRIBER Logic ...
      if (action === 'archive') {
        console.log(`📦 Archiving Subscriber: ${userId}`);
        // 1. Update Profile Status
        await supabaseAdmin.from('user_profiles')
          .update({ subscription_status: 'archived' })
          .eq('user_id', userId);

        // 2. Ban User (Block Login)
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { ban_duration: '876000h' } // 100 years ban
        );
        if (banError) console.warn('Warning banning user:', banError);

      } else {
        // Delete Subscriber completely
        console.log(`🗑️ Deleting Subscriber: ${userId}`);
        await supabaseAdmin.from('user_profiles').delete().eq('user_id', userId); // Explicit profile delete
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;
      }
    }

    return new Response(
      JSON.stringify({ message: `User ${userId} processed successfully (Action: ${action || 'delete'})` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Nuke Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
