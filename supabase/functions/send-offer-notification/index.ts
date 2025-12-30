
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { offerId, offerTitle, partnerName } = await req.json();

    if (!offerTitle) {
      throw new Error("Missing offer details");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Nowme <contact@nowme.fr>", // Update if domain is different
        to: ["rhodia@nowme.fr"],
        subject: `⚠️ Offre modifiée : ${offerTitle}`,
        html: `
          <h1>Une offre active a été modifiée</h1>
          <p><strong>Partenaire :</strong> ${partnerName || "Inconnu"}</p>
          <p><strong>Offre :</strong> ${offerTitle}</p>
          <p><strong>ID :</strong> ${offerId}</p>
          <p>Cette offre a été passée automatiquement en statut "En validation".</p>
          <p>Merci de vérifier les modifications et de re-valider l'offre si tout est conforme.</p>
          <br/>
          <a href="https://club.nowme.fr/admin/offers" style="background-color: #E6007E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Aller au Dashboard Admin</a>
        `,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});