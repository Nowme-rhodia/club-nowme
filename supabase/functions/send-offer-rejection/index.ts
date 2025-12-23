import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, contactName, offerTitle, rejectionReason } = await req.json();

    if (!to || !contactName || !offerTitle || !rejectionReason) {
      return new Response(JSON.stringify({
        success: false,
        error: "Données manquantes"
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
  <title>Votre offre n'a pas été retenue</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #BF2778; font-size: 24px; margin-bottom: 10px;">Votre offre n'a pas été retenue</h1>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Bonjour ${contactName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px;">
      Nous avons étudié avec attention votre offre "<strong>${offerTitle}</strong>".
    </p>
    <p style="margin: 0; font-size: 16px;">
      Malheureusement, nous ne pouvons pas l'accepter pour le moment.
    </p>
  </div>

  <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #ffc107;">
    <h3 style="color: #856404; margin-top: 0;">📝 Raison du refus :</h3>
    <p style="margin: 0; color: #856404; font-size: 16px;">${rejectionReason}</p>
  </div>

  <div style="background-color: #e6f7e6; padding: 20px; border-radius: 10px; margin: 30px 0;">
    <h3 style="color: #2d5a2d; margin-top: 0;">💡 Que faire maintenant ?</h3>
    <ul style="margin: 0; padding-left: 20px; color: #2d5a2d; font-size: 14px;">
      <li>Vous pouvez modifier votre offre selon nos commentaires</li>
      <li>Soumettre une nouvelle offre qui correspond mieux à nos critères</li>
      <li>Nous contacter pour plus d'informations</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://club.nowme.fr/devenir-partenaire" style="background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
      📝 Soumettre une nouvelle offre
    </a>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="margin: 0; color: #666; font-size: 14px;">
      Des questions ? Contactez-nous sur 
      <a href="mailto:contact@nowme.fr" style="color: #BF2778;">contact@nowme.fr</a>
    </p>
    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
      L'équipe Nowme 💕
    </p>
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
        subject: `❌ Votre offre "${offerTitle}" n'a pas été retenue`,
        html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Erreur Resend:", errorText);
      return new Response(JSON.stringify({
        success: false,
        error: "Erreur d'envoi email"
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    logger.success(`Email de rejet envoyé à: ${to}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    logger.error("Erreur envoi rejet:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
});