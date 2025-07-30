// supabase/functions/send-partner-approval/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/utils/cors.ts";
import { logger } from "../_shared/utils/logging.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, name, offer } = await req.json();

    if (!to || !name || !offer?.title) {
      return new Response(
        JSON.stringify({ success: false, error: "Données manquantes" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const html = `
      <h2>Félicitations ${name} !</h2>
      <p>Votre offre <strong>${offer.title}</strong> a été validée et sera bientôt visible par les abonnées du Nowme Club !</p>
      <p>On vous recontacte très vite avec les prochaines étapes ✨</p>
      <p>— L'équipe Kiff Community</p>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>",
        to,
        subject: "🎉 Votre offre a été validée !",
        html
      })
    });

    if (!resendRes.ok) {
      const text = await resendRes.text();
      logger.error("Erreur Resend:", text);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur Resend" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
      status: 200,
    });

  } catch (err) {
    logger.error("Erreur globale:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
