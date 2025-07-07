import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  EmailService,
  createSupabaseClient,
  corsHeaders,
  handleCors,
  logger
} from "../_shared/utils/index.ts";

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

serve(async (req) => {
  // ✅ CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = createSupabaseClient();
  const emailService = new EmailService({
    password: Deno.env.get('GMAIL_PASSWORD'),
  });

  try {
    // 📥 Récupérer les emails en attente
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

    logger.info(`Processing ${pendingEmails.length} emails...`);

    await emailService.connect();

    for (const email of pendingEmails) {
      try {
        logger.info(`Sending email to ${email.to_address}...`);

        await emailService.sendEmail({
          to: email.to_address,
          subject: email.subject,
          content: email.content,
        });

        await supabase
          .from('emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        await supabase.from('email_logs').insert([
          { email_id: email.id, status: 'sent', message: 'Email sent successfully' },
        ]);

        logger.success(`✅ Email sent to ${email.to_address}`);
      } catch (error) {
        logger.error(`❌ Error sending email to ${email.to_address}`, error);

        const retryCount = (email.retry_count || 0) + 1;
        const status = retryCount >= MAX_RETRIES ? 'failed' : 'pending';
        const retryDelay = Math.pow(2, retryCount) * 1000;

        await supabase
          .from('emails')
          .update({
            status,
            error_log: String(error),
            retry_count: retryCount,
            last_retry: new Date().toISOString(),
            next_retry_at: new Date(Date.now() + retryDelay).toISOString(),
          })
          .eq('id', email.id);

        await supabase.from('email_logs').insert([
          { email_id: email.id, status, message: String(error) },
        ]);
      }
    }

    await emailService.close();

    return new Response(
      JSON.stringify({ success: true, processed: pendingEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    logger.error('Error processing email queue', error);

    try {
      await emailService.close();
    } catch (e) {
      logger.error('Error closing SMTP connection', e);
    }

    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
