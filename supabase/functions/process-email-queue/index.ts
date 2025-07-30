import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const client = new SmtpClient();

  try {
    // Configuration SMTP
    const config = {
      hostname: "smtp.gmail.com",
      port: 465,
      username: "contact@nowme.fr",
      password: Deno.env.get('GMAIL_PASSWORD'),
      tls: true,
    };

    // Récupérer les emails en attente
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('emails')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;
    if (!pendingEmails?.length) {
      return new Response(
        JSON.stringify({ message: 'No pending emails' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Processing ${pendingEmails.length} emails...`);

    // Connexion SMTP
    await client.connectTLS(config);

    // Traiter chaque email
    for (const email of pendingEmails) {
      try {
        console.log(`📧 Sending email to ${email.to_address}...`);
        
        await client.send({
          from: config.username,
          to: email.to_address,
          subject: email.subject,
          content: email.content,
        });

        // Marquer comme envoyé
        const { error: updateError } = await supabase
          .from('emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);

        if (updateError) throw updateError;
        
        console.log(`✅ Email sent successfully to ${email.to_address}`);

      } catch (error) {
        console.error(`❌ Error sending email to ${email.to_address}:`, error);

        const retryCount = (email.retry_count || 0) + 1;
        const status = retryCount >= MAX_RETRIES ? 'failed' : 'pending';

        // Mettre à jour le statut et le compteur de tentatives
        const { error: updateError } = await supabase
          .from('emails')
          .update({
            status,
            error: error.message,
            retry_count: retryCount,
            last_retry: new Date().toISOString()
          })
          .eq('id', email.id);

        if (updateError) {
          console.error('Error updating email status:', updateError);
        }
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: pendingEmails.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing email queue:', error);

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
        status: 500 
      }
    );
  }
});