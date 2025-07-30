// supabase/functions/send-partner-confirmation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/utils/cors.ts";
import { logger } from "../_shared/utils/logging.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, submission } = await req.json();

    if (!to || !submission?.contactName || !submission?.businessName) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs requis manquants" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const html = `
      Bonjour ${submission.contactName},<br/><br/>
      Nous avons bien reçu votre demande de partenariat pour <strong>${submission.businessName}</strong>.<br/><br/>
      <u>Récapitulatif de votre demande :</u><br/>
      - Offre : ${submission.offer?.title || "-"}<br/>
      - Description : ${submission.offer?.description || "-"}<br/>
      - Catégorie : ${submission.offer?.category || "-"}<br/>
      - Prix : ${submission.offer?.price || "-"} €<br/>
      - Localisation : ${submission.offer?.location || "-"}<br/><br/>
      Notre équipe va étudier votre demande dans les plus brefs délais.<br/>
      Vous recevrez une réponse par email dans un délai maximum de 48h.<br/><br/>
      Cordialement,<br/>
      L’équipe Kiff Community
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>",
        to,
        subject: "Confirmation de votre demande de partenariat",
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      logger.error("Erreur Resend:", errorText);
      return new Response(JSON.stringify({ success: false, error: "Erreur Resend" }), {
        headers: corsHeaders,
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    logger.error("Erreur générale:", err);
    return new Response(JSON.stringify({ success: false, error: "Erreur inattendue" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
