
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch admins
    const { data: admins, error: adminError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('is_admin', true);

    if (adminError) {
      console.error("Error fetching admins:", adminError);
    }

    // Default admins + dynamic ones
    const defaultAdmins = ["rhodia.kw@gmail.com", "admin@admin.fr"];
    const dynamicAdmins = admins?.map(a => a.email).filter(e => e) || [];

    // Merge and deduplicate
    const recipients = [...new Set([...defaultAdmins, ...dynamicAdmins])];

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Nowme <contact@nowme.fr>",
        to: recipients,
        subject: `Offre modifiée : ${offerTitle}`,
        text: `
Une offre active a été modifiée.

Partenaire : ${partnerName || "Inconnu"}
Offre : ${offerTitle}
ID : ${offerId}

Cette offre a été passée automatiquement en statut "En validation".
Merci de vérifier les modifications et de re-valider l'offre si tout est conforme.

Aller au Dashboard Admin: https://club.nowme.fr/admin/offers
        `,
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
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});