// supabase/functions/stripe-user-welcome/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// HTML email
function generateWelcomeEmail(prenom: string, link: string): string {
  return `
  <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #BF2778;">Bienvenue chez Nowme !</h2>
        <p>Bonjour ${prenom || ""},</p>
        <p>Ton compte a bien été créé après ton inscription 💃</p>
        <p>Avant d’en profiter, il ne reste qu’une seule chose à faire :</p>
        <p style="text-align:center;">
          <a href="${link}" style="background-color:#BF2778;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Créer mon mot de passe</a>
        </p>
        <p>Ce lien est valable 24h.</p>
        <p>Si tu n'es pas à l’origine de cette inscription, ignore ce message.</p>
        <p style="margin-top:40px;">À très vite,<br>L’équipe Nowme ✨</p>
      </div>
    </body>
  </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, firstName, redirectTo } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: "email manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectTo || "https://club.nowme.fr/update-password"
      }
    });

    if (error) {
      console.error("Erreur lien:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const link = data?.properties?.action_link;
    const html = generateWelcomeEmail(firstName || "", link);

    // ✉️ Envoi via mailer Supabase
    const mailRes = await fetch("https://api.supabase.com/v1/mailer/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Nowme <contact@nowme.fr>",
        to: email,
        subject: "Bienvenue chez Nowme ! Crée ton mot de passe",
        html
      })
    });

    if (!mailRes.ok) {
      const err = await mailRes.text();
      console.error("Erreur mail:", err);
      return new Response(JSON.stringify({ success: false, error: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Email envoyé !" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Erreur globale:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
