import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const client = new SmtpClient();

  try {
    const { to, signupUrl } = await req.json();

    // Configuration SMTP pour Gmail
    const config = {
      hostname: "smtp.gmail.com",
      port: 465,
      username: "contact@nowme.fr",
      password: Deno.env.get('GMAIL_PARTNER_PASSWORD'),
      tls: true,
    };

    await client.connectTLS(config);

    // Construire le contenu de l'email
    const emailContent = `
      Félicitations !

      Votre demande de partenariat a été approuvée.
      Pour finaliser votre inscription et commencer à proposer vos services, veuillez cliquer sur le lien ci-dessous :

      ${signupUrl}

      Ce lien est valable pendant 7 jours.

      Cordialement,
      L'équipe Kiff Community
    `;

    await client.send({
      from: config.username,
      to,
      subject: "Votre demande de partenariat a été approuvée",
      content: emailContent,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error sending email:', error);
    if (client) {
      try {
        await client.close();
      } catch (e) {
        console.error('Error closing SMTP connection:', e);
      }
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});