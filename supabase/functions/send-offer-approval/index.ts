import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, contactName, offerTitle, commissionRate = 20 } = await req.json();

    const nowmeShare = commissionRate;
    const partnerShare = 100 - commissionRate;

    if (!to || !contactName || !offerTitle) {
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
  <title>Votre offre a été approuvée !</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #BF2778; font-size: 28px; margin-bottom: 10px;">🎉 Félicitations ${contactName} !</h1>
    <p style="font-size: 18px; color: #666;">Votre offre a été approuvée !</p>
  </div>

  <div style="background: linear-gradient(135deg, #BF2778, #E4D44C); color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
    <h2 style="margin: 0 0 15px 0; font-size: 22px;">✨ Votre offre est maintenant en ligne !</h2>
    <p style="margin: 0; font-size: 16px;">L'offre "<strong>${offerTitle}</strong>" est désormais visible par toutes nos membres.</p>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0;">
    <h3 style="color: #BF2778; margin-top: 0;">🚀 Prochaines étapes :</h3>
    <ul style="margin: 0; padding-left: 20px; font-size: 16px;">
      <li>Votre offre est maintenant visible par nos membres</li>
      <li>Vous recevrez des notifications pour chaque réservation</li>
      <li>Gérez vos réservations depuis votre espace partenaire</li>
      <li>Suivez vos revenus en temps réel</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://club.nowme.fr/partner/dashboard" style="background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
      🏠 Accéder à mon espace
    </a>
  </div>

  <div style="background-color: #e6f7e6; padding: 15px; border-radius: 10px; margin: 30px 0;">
    <p style="margin: 0; color: #2d5a2d; font-size: 14px; text-align: center;">
      💰 <strong>Commission Nowme :</strong> ${nowmeShare}% sur chaque réservation<br>
      📊 Vous recevrez ${partnerShare}% du montant de chaque vente
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; border: 1px dashed #BF2778; border-radius: 10px;">
    <p style="margin: 0; color: #666; font-size: 16px;">
      N'hésitez pas à le partager sur les réseaux sociaux en taguant <strong>@nowme_une.femme.en.off</strong>, je repartagerai avec plaisir !
    </p>
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
        subject: `🎉 Votre offre "${offerTitle}" est approuvée !`,
        html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle 429 Too Many Requests specifically
      if (response.status === 429) {
        logger.error("Quota Resend dépassé (429). Email ignoré mais offre approuvée.");
        // Return 200 OK to frontend so it doesn't show error to user
        return new Response(JSON.stringify({
          success: true,
          warning: "Offre approuvée en base, mais email mis en file d'attente ou ignoré (quota dépassé)."
        }), {
          status: 200,
          headers: corsHeaders,
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

    logger.success(`Email d'approbation envoyé à: ${to}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    logger.error("Erreur envoi approbation:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
});