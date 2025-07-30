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
    const { submission } = await req.json();

    // Configuration SMTP pour Gmail avec le compte partenaire
    const config = {
      hostname: "smtp.gmail.com",
      port: 465,
      username: "contact@nowme.fr",
      password: Deno.env.get('GMAIL_PASSWORD'),
      tls: true,
    };

    await client.connectTLS(config);

    // Construire le contenu de l'email
    const emailContent = `
      Nouvelle demande de partenariat reçue !

      Informations du partenaire :
      - Entreprise : ${submission.businessName}
      - Contact : ${submission.contactName}
      - Email : ${submission.email}
      - Téléphone : ${submission.phone}

      Détails de l'offre :
      - Titre : ${submission.offer.title}
      - Description : ${submission.offer.description}
      - Catégorie : ${submission.offer.category}
      - Prix : ${submission.offer.price}€
      - Localisation : ${submission.offer.location}

      Vous pouvez gérer cette demande depuis le tableau de bord administrateur.
    `;

    await client.send({
      from: config.username,
      to: config.username,
      subject: "Nouvelle demande de partenariat",
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