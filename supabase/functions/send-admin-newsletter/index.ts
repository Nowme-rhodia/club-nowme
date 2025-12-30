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
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { subject, body } = await req.json();

        if (!subject || !body) {
            return new Response(JSON.stringify({ error: "Sujet et contenu requis" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 1. Fetch subscribed users
        const { data: subscribers, error: usersError } = await supabase
            .from("user_profiles")
            .select("email, first_name")
            .eq("sub_newsletter", true)
            .not("email", "is", null);

        if (usersError || !subscribers) {
            console.error("Error fetching subscribers:", usersError);
            return new Response(JSON.stringify({ error: "Error fetching subscribers" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`📣 Sending newsletter to ${subscribers.length} subscribers.`);

        // 2. Send Emails (Looping for now, ideally batch)
        let sentCount = 0;

        // Using a simpler loop to avoid overwhelming concurrent connections if list is huge
        // For MVP < 1000 users, Promise.all is okay-ish but rate limits exist.
        // Let's do chunks of 20
        const chunkSize = 20;
        for (let i = 0; i < subscribers.length; i += chunkSize) {
            const chunk = subscribers.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (user) => {
                try {
                    // Simple HTML wrapper
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
                        ${body}
                        <div class="footer">
                            <p>Envoyé avec ❤️ par le Club Nowme</p>
                            <p>Pour vous désinscrire, rendez-vous dans votre espace membre.</p>
                        </div>
                    </body>
                    </html>
                `;

                    await resend.emails.send({
                        from: "Nowme Club <contact@nowme.fr>", // Using verified domain
                        to: [user.email],
                        subject: subject,
                        html: finalHtml,
                    });
                    sentCount++;
                } catch (e) {
                    console.error(`Failed to send to ${user.email}:`, e);
                }
            }));
        }

        return new Response(JSON.stringify({ success: true, count: sentCount }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Critical error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
