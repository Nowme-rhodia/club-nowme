// supabase/functions/send-partner-confirmation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = createSupabaseClient();
    const { to, submission } = await req.json();

    if (!to || !submission?.contactName || !submission?.businessName) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs requis manquants" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const content = `
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

    const { error } = await supabase.from("emails").insert({
      to_address: to,
      subject: "Confirmation de votre demande de partenariat",
      content,
    });

    if (error) {
      logger.error("Erreur enregistrement email :", error);
      return new Response(JSON.stringify({ success: false, error: "Erreur base de données" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    logger.error("Erreur générale :", err);
    return new Response(JSON.stringify({ success: false, error: "Erreur inattendue" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
