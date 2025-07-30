// supabase/functions/send-partner-submission/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

serve(async (req) => {
  // ✅ Gérer les requêtes OPTIONS (CORS)
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = createSupabaseClient();
    const { name, email, phone, website, message } = await req.json();

    if (!email || !name || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: "Champs obligatoires manquants"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // ✅ Créer le contenu HTML du mail
    const html = `
      <h2>Nouvelle demande de partenariat</h2>
      <p><strong>Nom :</strong> ${name}</p>
      <p><strong>Email :</strong> ${email}</p>
      ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ""}
      ${website ? `<p><strong>Site web :</strong> ${website}</p>` : ""}
      <p><strong>Message :</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
    `;

    // ✅ Ajouter à la table emails (statut = pending)
    const { error } = await supabase.from("emails").insert({
      to_address: "contact@nowme.fr",
      subject: "Nouvelle demande de partenariat",
      content: html
    });

    if (error) {
      logger.error("Erreur insertion email:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Erreur lors de l’enregistrement du message"
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Demande enregistrée avec succès"
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    logger.error("Erreur globale:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Erreur inattendue"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
