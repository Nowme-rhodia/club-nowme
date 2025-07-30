import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const supabase = createSupabaseClient();
    const { name, email, phone, website, message } = await req.json();

    if (!email || !name || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: "Champs obligatoires manquants"
      }), { status: 400, headers: corsHeaders });
    }

    const html = `
      <h2>Nouvelle demande de partenariat</h2>
      <p><strong>Nom :</strong> ${name}</p>
      <p><strong>Email :</strong> ${email}</p>
      ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ""}
      ${website ? `<p><strong>Site web :</strong> ${website}</p>` : ""}
      <p><strong>Message :</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>",
        to: "contact@nowme.fr",
        subject: "Nouvelle demande de partenariat",
        html
      })
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error("Erreur envoi Resend:", err);
      return new Response(JSON.stringify({
        success: false,
        error: "Erreur d’envoi avec Resend"
      }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Demande envoyée avec succès"
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    logger.error("Erreur globale:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Erreur inattendue"
    }), { status: 500, headers: corsHeaders });
  }
});
