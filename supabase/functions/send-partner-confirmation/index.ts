import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, submission } = await req.json();

    if (!to || !submission?.contactName || !submission?.businessName) {
      return new Response(JSON.stringify({ success: false, error: "Champs requis manquants" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const html = `
      <h2>Merci pour votre demande de partenariat, ${submission.contactName} !</h2>
      <p>Nous avons bien reçu votre demande pour <strong>${submission.businessName}</strong>.</p>
      <h3>Résumé :</h3>
      <ul>
        <li><strong>Offre :</strong> ${submission.offer?.title || "-"}</li>
        <li><strong>Description :</strong> ${submission.offer?.description || "-"}</li>
        <li><strong>Catégorie :</strong> ${submission.offer?.category || "-"}</li>
        <li><strong>Prix :</strong> ${submission.offer?.price || "-"}€</li>
        <li><strong>Localisation :</strong> ${submission.offer?.location || "-"}</li>
      </ul>
      <p>Nous revenons vers vous sous 48h. À très vite !</p>
      <p>— L'équipe Kiff Community</p>
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
        subject: "Confirmation de votre demande de partenariat",
        html
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error("Erreur Resend:", errText);
      return new Response(JSON.stringify({ success: false, error: "Erreur d’envoi avec Resend" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    logger.error("Erreur générale:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
