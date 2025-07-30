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
      <h2>😔 Votre offre n'a pas été retenue</h2>
      <p>Bonjour ${contactName},</p>
      <p>Nous avons bien reçu votre proposition <strong>${offerTitle}</strong>, mais elle ne correspond pas tout à fait aux critères actuels de la communauté.</p>
      <p>Mais ne vous découragez pas ! Vous pouvez toujours proposer d’autres offres ou nous contacter si besoin.</p>
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
        subject: "⛔ Votre offre n'a pas été validée",
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
    logger.error("Erreur envoi rejection:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: corsHeaders,
      status: 500
    });
  }
});
