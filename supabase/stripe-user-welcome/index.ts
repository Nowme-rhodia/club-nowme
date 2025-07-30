import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// ✅ CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// ✅ SMTP config
const smtpConfig = {
  hostname: "smtp.gmail.com",
  port: 465,
  username: "contact@nowme.fr",
  password: Deno.env.get("GMAIL_PASSWORD"),
  tls: true
};

// ✅ Génération du contenu HTML de l'email
function generateWelcomeEmail(prenom: string, link: string) {
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

// ✅ Envoi de l’email
async function sendEmail(to: string, subject: string, html: string) {
  const client = new SmtpClient();
  try {
    await client.connectTLS(smtpConfig);
    await client.send({
      from: smtpConfig.username,
      to,
      subject,
      html
    });
    await client.close();
    return { success: true };
  } catch (error) {
    console.error("Erreur SMTP:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Serveur principal
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
      return new Response(JSON.stringify({
        success: false,
        error: "email manquant"
      }), {
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
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const link = data?.properties?.action_link;
    const html = generateWelcomeEmail(firstName || "", link);
    const emailResult = await sendEmail(email, "Bienvenue ! Crée ton mot de passe", html);

    if (!emailResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: emailResult.error
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "email envoyé à " + email
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Erreur globale:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
