import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Fetch all partners with their offers
        const { data: partners, error } = await supabaseAdmin
            .from('partners')
            .select(`
                id, 
                business_name, 
                contact_name, 
                contact_email, 
                stripe_account_id,
                created_at,
                offers (
                    id, 
                    status
                )
            `);

        if (error) throw error;

        const results = [];

        for (const partner of partners) {
            // Logic to determine what sets are missing
            const missingSteps = [];

            // A. Check Stripe
            if (!partner.stripe_account_id) {
                missingSteps.push({
                    type: 'stripe',
                    text: 'Lier votre compte bancaire (Stripe) pour recevoir vos paiements.',
                    cta: '🔗 Configurer Stripe'
                });
            }

            // B. Check Offers
            const offers = partner.offers || [];
            const hasCreatedOffers = offers.length > 0;
            const hasSubmittedOffers = offers.some((o: any) => ['pending', 'approved', 'rejected', 'active'].includes(o.status));

            // If Stripe is OK, but no offers created
            if (partner.stripe_account_id && !hasCreatedOffers) {
                missingSteps.push({
                    type: 'create_offer',
                    text: 'Créer votre première offre pour être visible sur le club.',
                    cta: '📝 Créer une offre'
                });
            }
            // If offers created but NONE submitted (all drafts)
            else if (hasCreatedOffers && !hasSubmittedOffers) {
                missingSteps.push({
                    type: 'submit_offer',
                    text: 'Soumettre vos offres en brouillon pour validation.',
                    cta: '🚀 Soumettre mes offres'
                });
            }

            // Determine if we should send an email
            // We verify if the partner is "incomplete"
            // Condition: At least one missing step AND partner is not "dead" (optional logic, keeping it simple for now)
            if (missingSteps.length > 0) {

                // Build the HTML email
                const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Finalisez votre compte Nowme</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FAFAFA;">
  
  <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    
    <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #BF2778; margin: 0; font-size: 24px;">Coucou ${partner.contact_name || partner.business_name} ! 👋</h1>
    </div>

    <p style="font-size: 16px; color: #555;">
      J'espère que tu vas bien ! <br><br>
      Je faisais un petit point sur les comptes partenaires, et j'ai vu qu'il manquait quelques petits détails pour que tout soit parfait pour toi sur le Club Nowme. 💖
    </p>

    <div style="background-color: #FFF0F7; border-left: 4px solid #BF2778; padding: 20px; border-radius: 4px; margin: 25px 0;">
      <p style="margin-top: 0; font-weight: bold; color: #BF2778;">Voici ce qu'il reste à faire :</p>
      <ul style="margin-bottom: 0; padding-left: 20px;">
        ${missingSteps.map(step => `<li style="margin-bottom: 10px; color: #444;">${step.text}</li>`).join('')}
      </ul>
    </div>

    <p style="font-size: 16px; color: #555;">
      C'est très rapide à faire ! Une fois terminé, tu seras visible auprès de toute la communauté. ✨
    </p>

    <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
      <a href="https://club.nowme.fr/partner/dashboard" style="background-color: #BF2778; color: white; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(191, 39, 120, 0.3);">
        Accéder à mon espace partenaire
      </a>
    </div>

    <p style="text-align: center; font-size: 14px; color: #888; margin-top: 40px;">
      Besoin d'aide ? N'hésite pas à consulter notre <a href="https://club.nowme.fr/partner/guide" style="color: #BF2778;">guide partenaire</a> ou à répondre directement à cet email.
    </p>

    <p style="text-align: center; font-size: 14px; color: #888;">
      À très vite,<br>
      L'équipe Nowme 💕
    </p>

  </div>
</body>
</html>
                `;

                // Send Email via Resend
                const res = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${RESEND_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        from: "Nowme Club <contact@nowme.fr>",
                        to: partner.contact_email,
                        subject: `🎀 Coucou ${partner.contact_name}, on finalise ton profil ?`,
                        html: emailHtml
                    })
                });

                if (res.ok) {
                    results.push({ id: partner.id, status: 'sent', missing: missingSteps.map(s => s.type) });
                } else {
                    const errorText = await res.text();
                    console.error('Resend Error:', errorText);
                    results.push({ id: partner.id, status: 'error', error: errorText });
                }

            } else {
                results.push({ id: partner.id, status: 'skipped', reason: 'complete' });
            }
        }

        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Function Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
