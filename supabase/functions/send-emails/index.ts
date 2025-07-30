import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL");

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = createSupabaseClient();

  try {
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("emails")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!pendingEmails?.length) {
      return new Response(JSON.stringify({ message: "No pending emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info(`Processing ${pendingEmails.length} emails...`);

    for (const email of pendingEmails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Nowme <${FROM_EMAIL}>`,
            to: email.to_address,
            subject: email.subject,
            html: email.content,
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        await supabase
          .from("emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", email.id);

        await supabase.from("email_logs").insert([
          {
            email_id: email.id,
            status: "sent",
            message: "Email sent successfully",
          },
        ]);

        logger.success(`✅ Email sent to ${email.to_address}`);
      } catch (error) {
        logger.error(`❌ Error sending email to ${email.to_address}`, error);

        const retryCount = (email.retry_count || 0) + 1;
        const status = retryCount >= MAX_RETRIES ? "failed" : "pending";
        const retryDelay = Math.pow(2, retryCount) * 1000;

        await supabase
          .from("emails")
          .update({
            status,
            error_log: String(error),
            retry_count: retryCount,
            last_retry: new Date().toISOString(),
            next_retry_at: new Date(Date.now() + retryDelay).toISOString(),
          })
          .eq("id", email.id);

        await supabase.from("email_logs").insert([
          {
            email_id: email.id,
            status,
            message: String(error),
          },
        ]);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: pendingEmails.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logger.error("Error processing email queue", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
