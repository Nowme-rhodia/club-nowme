import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, offerTitle, contactName } = await req.json();

    if (!to || !offerTitle || !contactName) {
      return new Response(JSON.stringify({ success: false, error: "Données manquantes" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const html = `
      <h2>🎉 Votre offre a été validée !</h2>
      <p>Bonjour ${contactName},</p>
      <p>Félicitations ! Votre offre <strong>${offerTitle}</strong> a été acceptée et est désormais visible par toutes les abonnées de Nowme Club.</p>
      <p>On a hâte de voir les kiffs qu’elle va déclencher 🎯</p>
      <p>— L’équipe Kiff Community</p>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>",
        to,
        subject: "🎉 Votre offre est en ligne !",
        html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Erreur Resend:", errorText);
      return new Response(JSON.stringify({ success: false, error: "Erreur Resend" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    logger.error("Erreur envoi approval:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: corsHeaders,
      status: 500
    });
  }
});
