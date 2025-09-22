import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { partnerName, offerTitle, offerDescription } = await req.json();

    if (!partnerName || !offerTitle) {
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
  <title>Nouvelle offre à valider</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #BF2778; font-size: 24px; margin-bottom: 10px;">📝 Nouvelle offre à valider</h1>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
    <h2 style="color: #BF2778; margin-top: 0;">Détails de l'offre :</h2>
    <ul style="margin: 0; padding-left: 20px; font-size: 16px;">
      <li><strong>Partenaire :</strong> ${partnerName}</li>
      <li><strong>Titre :</strong> ${offerTitle}</li>
      <li><strong>Description :</strong> ${offerDescription}</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://club.nowme.fr/admin/pending-offers" style="background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
      🔍 Voir dans l'admin
    </a>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="margin: 0; color: #666; font-size: 14px;">
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
        to: "contact@nowme.fr", // Email admin
        subject: `📝 Nouvelle offre à valider : ${offerTitle}`,
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

    logger.success(`Notification envoyée pour l'offre: ${offerTitle}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    logger.error("Erreur envoi notification:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
});