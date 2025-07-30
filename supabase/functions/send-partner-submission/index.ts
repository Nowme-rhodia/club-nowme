// supabase/functions/send-partner-submission/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = createSupabaseClient();
    const { name, email, phone, website, message, offer, businessName } = await req.json();

    if (!email || !name || !message || !businessName || !offer) {
      return new Response(JSON.stringify({
        success: false,
        error: "Champs obligatoires manquants"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const html = `
      <h2>Nouvelle demande de partenariat</h2>
      <p><strong>Nom :</strong> ${name}</p>
      <p><strong>Email :</strong> ${email}</p>
      ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ""}
      ${website ? `<p><strong>Site web :</strong> ${website}</p>` : ""}
      <p><strong>Message :</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
    `;

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

    // 🔁 Appel de la fonction d’email de confirmation via fetch
    const confirmationResponse = await fetch(`${Deno.env.get("SUPABASE_FUNCTIONS_URL")}/send-partner-confirmation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({
        to: email,
        submission: {
          contactName: name,
          businessName,
          offer
        }
      })
    });

    if (!confirmationResponse.ok) {
      const errorText = await confirmationResponse.text();
      logger.error("Erreur email confirmation:", errorText);
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
