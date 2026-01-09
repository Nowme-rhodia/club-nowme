import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, contactName, offerTitle } = await req.json();

    if (!to || !offerTitle) {
      return new Response(JSON.stringify({
        success: false,
        error: "Données manquantes (to, offerTitle)"
      }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Votre offre est en cours de validation</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
  
  <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #BF2778 0%, #E4D44C 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Nowme Club</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #BF2778; font-size: 24px; margin: 0 0 10px 0;">Merci ${contactName || 'Partenaire'} !</h2>
        <p style="font-size: 16px; color: #666; margin: 0;">Votre offre a bien été reçue.</p>
      </div>

      <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
        <p style="margin: 0; font-size: 18px; font-weight: 500; color: #831843;">
          "${offerTitle}"
        </p>
        <div style="margin-top: 10px; display: inline-block; background-color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; color: #BF2778; border: 1px solid #BF2778;">
          ⏳ En cours de validation
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center;">Que va-t-il se passer ?</h3>
        
        <div style="display: flex; margin-bottom: 15px;">
          <div style="background-color: #fef9c3; color: #854d0e; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">1</div>
          <div>
            <div style="font-weight: 600; font-size: 15px;">Examen</div>
            <div style="color: #666; font-size: 14px;">Notre équipe vérifie les détails de votre offre sous 24 à 48h.</div>
          </div>
        </div>

        <div style="display: flex; margin-bottom: 15px;">
          <div style="background-color: #fef9c3; color: #854d0e; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0;">2</div>
          <div>
            <div style="font-weight: 600; font-size: 15px;">Validation</div>
            <div style="color: #666; font-size: 14px;">Si tout est bon, elle sera mise en ligne immédiatement.</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px solid #f0f0f0; padding-top: 30px;">
        <a href="https://club.nowme.fr/partner/dashboard" style="background-color: #BF2778; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 15px; display: inline-block;">
          Accéder à mon espace
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
      <p style="margin: 0 0 5px 0;">Des questions ? Écrivez-nous à <a href="mailto:contact@nowme.fr" style="color: #BF2778; text-decoration: none;">contact@nowme.fr</a></p>
      <p style="margin: 0;">&copy; Nowme Club. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>",
        to,
        subject: `⏳ Votre offre "${offerTitle}" est en cours de validation`,
        html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Handle rate limits gracefully-ish
      if (response.status === 429) {
        logger.error("Rate limit Resend (429) reached.");
        return new Response(JSON.stringify({ success: true, warning: 'Email submission rate limited' }), {
          status: 200,
          headers: corsHeaders
        });
      }

      logger.error("Erreur Resend:", errorText);
      return new Response(JSON.stringify({
        success: false,
        error: "Erreur d'envoi email"
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    logger.success(`Email de soumission envoyé à: ${to}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    logger.error("Erreur envoi soumission:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
});
