// ✅ Cron d’envoi des emails (batch depuis table "emails")
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = createSupabaseClient();

  try {
    // 🔹 1. Récupération des emails en attente
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
        status: 200,
      });
    }

    logger.info(`📧 Processing ${pendingEmails.length} emails...`);

    // 🔹 2. Envoi des emails un par un
    for (const email of pendingEmails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Nowme Club <contact@nowme.fr>", // ✅ expéditeur fixe
            to: email.to_address,
            subject: email.subject,
            html: email.content, // ⚠️ doit être du HTML
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend API error: ${errText}`);
        }

        // 🔹 3. Mise à jour succès
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
        // 🔹 4. Gestion des échecs avec retry
        logger.error(`❌ Error sending email to ${email.to_address}`, error);

        const retryCount = (email.retry_count || 0) + 1;
        const status = retryCount >= MAX_RETRIES ? "failed" : "pending";
        const retryDelay = Math.pow(2, retryCount) * 1000; // backoff exponentiel

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
    logger.error("🚨 Error processing email queue", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
