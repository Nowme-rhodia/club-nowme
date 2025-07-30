// supabase/functions/send-partner-rejection/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/utils/cors.ts";
import { logger } from "../_shared/utils/logging.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { to, name } = await req.json();

    if (!to || !name) {
      return new Response(
        JSON.stringify({ success: false, error: "Données manquantes" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const html = `
      <h2>Bonjour ${name},</h2>
      <p>Merci pour votre demande de partenariat avec le Nowme Club.</p>
      <p>Après analyse, nous ne pouvons malheureusement pas donner suite à votre proposition pour le moment.</p>
      <p>Mais ne baissez pas les bras, vous pouvez retenter votre chance avec une autre offre ou nous recontacter plus tard.</p>
      <p>À bientôt,<br/>L’équipe Kiff Community</p>
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
        subject: "Votre demande de partenariat",
        html,
      })
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      logger.error("Erreur Resend:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur Resend" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    logger.error("Erreur générale:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
