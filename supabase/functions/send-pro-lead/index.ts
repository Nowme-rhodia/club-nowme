// supabase/functions/send-pro-lead/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=denonext"

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const resendApiKey = Deno.env.get('RESEND_API_KEY');

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await req.json();

        // 1️⃣ Insertion en base
        const { error: insertError } = await supabase
            .from('pro_leads')
            .insert({
                name: body.name,
                company: body.company,
                email: body.email,
                date_period: body.date_period || null,
                message: body.message,
            });

        if (insertError) throw insertError;

        // 2️⃣ Envoi des Emails
        if (resendApiKey) {
            const brandColor = '#BF2778';

            // Email pour Rhodia (Admin)
            const adminHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background-color: ${brandColor}; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Nouveau Projet Pro 🚀</h1>
          </div>
          <div style="padding: 32px; color: #333; line-height: 1.6;">
            <p style="margin-top: 0;">Une nouvelle demande vient d'être déposée sur la page <strong>Nowme Pro</strong>.</p>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 10px 0;"><strong>👤 Contact :</strong> ${body.name}</p>
              <p style="margin: 0 0 10px 0;"><strong>🏢 Entreprise :</strong> ${body.company}</p>
              <p style="margin: 0 0 10px 0;"><strong>📧 Email :</strong> <a href="mailto:${body.email}" style="color: ${brandColor};">${body.email}</a></p>
              <p style="margin: 0 0 10px 0;"><strong>📅 Période :</strong> ${body.date_period || "Non précisée"}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
              <p style="margin: 0;"><strong>📝 Message :</strong><br/>${body.message.replace(/\n/g, '<br/>')}</p>
            </div>
            <p>Il est recommandé de répondre sous 24h pour maximiser le taux de conversion.</p>
          </div>
        </div>
      `;

            // Email pour le Lead (Prospect)
            const firstName = body.name.split(' ')[0];
            const confirmHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.8;">
          <div style="text-align: center; padding: 40px 0;">
             <h1 style="color: ${brandColor}; font-size: 28px; margin: 0; letter-spacing: -0.5px;">Nowme</h1>
             <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 12px; color: #666; margin-top: 8px;">Conception & Pilotage d'événements</p>
          </div>
          
          <div style="padding: 0 20px;">
            <p style="font-size: 16px;">Bonjour ${firstName},</p>
            
            <p>Je vous remercie pour votre message concernant votre projet d'événement pour <strong>${body.company}</strong>.</p>
            
            <p>J'ai bien reçu vos informations. Je vais prendre le temps d'étudier votre demande pour vous proposer un format qui réponde précisément à vos enjeux d'équipe.</p>
            
            <p><strong>Je reviens vers vous personnellement sous 24 heures</strong> afin d'échanger plus en détail sur vos besoins.</p>
            
            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 30px;">
              <p style="margin: 0; font-weight: bold;">Rhodia</p>
              <p style="margin: 0; color: #666; font-size: 14px;">Fondatrice de Nowme</p>
              <p style="margin: 10px 0 0 0;">
                <a href="https://club.nowme.fr/pro" style="color: ${brandColor}; text-decoration: none; font-size: 14px;">club.nowme.fr/pro</a>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 40px 0; color: #999; font-size: 11px;">
            <p>© ${new Date().getFullYear()} Nowme. Tous droits réservés.</p>
          </div>
        </div>
      `;

            // Notify Rhodia
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
                body: JSON.stringify({
                    from: 'Nowme <contact@nowme.fr>',
                    to: 'contact@nowme.fr',
                    subject: `🚀 Nouveau projet : ${body.company}`,
                    html: adminHtml
                }),
            });

            // Confirm to Lead
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
                body: JSON.stringify({
                    from: 'Rhodia - Nowme <contact@nowme.fr>',
                    to: body.email,
                    subject: `Votre projet d'événement chez ${body.company} ✨`,
                    html: confirmHtml
                }),
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
})
