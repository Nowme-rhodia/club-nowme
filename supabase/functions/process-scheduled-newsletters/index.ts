import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Collect logs to return to client
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    };
    const errorLog = (msg: string, err?: any) => {
        console.error(msg, err);
        logs.push(`ERROR: ${msg} ${err ? JSON.stringify(err) : ''}`);
    };

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        log("🔄 PROCESSOR STARTED");
        log(`Server Time: ${new Date().toISOString()}`);

        const { data: newsletters, error: fetchError } = await supabase
            .from("admin_newsletters")
            .select("*")
            .eq("status", "scheduled")
            .lte("scheduled_at", new Date().toISOString());

        if (fetchError) {
            errorLog("Fetch error", fetchError);
            return new Response(JSON.stringify({ logs, error: fetchError }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (!newsletters || newsletters.length === 0) {
            log("✅ No due newsletters found.");
            // Check if there are ANY scheduled in the future
            const { count } = await supabase.from("admin_newsletters").select('*', { count: 'exact', head: true }).eq('status', 'scheduled');
            log(`(Total future scheduled items in DB: ${count})`);

            return new Response(JSON.stringify({ logs, message: "No pending newsletters" }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        log(`📦 Found ${newsletters.length} due newsletter(s).`);

        for (const newsletter of newsletters) {
            log(`▶️ Processing ${newsletter.id}`);

            const { error: updateError } = await supabase
                .from("admin_newsletters")
                .update({ status: 'processing' })
                .eq('id', newsletter.id)
                .eq('status', 'scheduled');

            if (updateError) {
                log(`⚠️ Lock failed for ${newsletter.id}`);
                continue;
            }

            const { data: subscribers, error: usersError } = await supabase
                .from("user_profiles")
                .select("email")
                .eq("sub_newsletter", true)
                .is("partner_id", null)
                .eq("is_admin", false)
                .not("email", "is", null);

            if (usersError || !subscribers || subscribers.length === 0) {
                log(`❌ No subscribers for ${newsletter.id}`);
                await supabase.from("admin_newsletters").update({ status: 'failed', sent_at: new Date() }).eq('id', newsletter.id);
                continue;
            }

            log(`👥 Target: ${subscribers.length} users.`);
            let sentCount = 0;

            for (const user of subscribers) {
                try {
                    const finalHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
                            .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #888; text-align: center; }
                        </style>
                    </head>
                    <body>
                        ${newsletter.body}
                        <div class="footer">
                            <p>Envoyé avec ❤️ par le Club Nowme</p>
                            <p>Pour vous désinscrire, rendez-vous dans votre espace membre.</p>
                        </div>
                    </body>
                    </html>
                `;

                    const data = await resend.emails.send({
                        from: "Nowme Club <contact@nowme.fr>",
                        to: [user.email],
                        subject: newsletter.subject,
                        html: finalHtml,
                    });

                    if (data.error) {
                        errorLog(`Send fail ${user.email}`, data.error);
                    } else {
                        sentCount++;
                    }
                    await new Promise(resolve => setTimeout(resolve, 600));
                } catch (e) {
                    errorLog(`Exception ${user.email}`, e);
                }
            }

            await supabase
                .from("admin_newsletters")
                .update({ status: 'sent', sent_at: new Date() })
                .eq('id', newsletter.id);

            log(`🏁 Done ${newsletter.id}. Sent: ${sentCount}`);
        }

        return new Response(JSON.stringify({ success: true, logs }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (error) {
        errorLog("CRITICAL ERROR", error);
        return new Response(JSON.stringify({ logs, error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
