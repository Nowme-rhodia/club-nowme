import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email, firstName } = await req.json();

        if (!email) {
            throw new Error("Email is missing");
        }

        console.log(`📧 Sending subscription welcome email to ${email} (${firstName})`);

        const { data, error } = await resend.emails.send({
            from: 'NowMe <onboarding@nowme.fr>',
            to: email,
            subject: 'Bienvenue au Club Nowme ! 💖',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #db2777; text-align: center;">Bienvenue au Club ! 🎉</h1>
          
          <p>Bonjour ${firstName || "Beauty"},</p>
          
          <p>Quel bonheur de te compter parmi nous ! Ton abonnement est validé et ton compte est 100% actif.</p>
          
          <p>Tu fais maintenant partie de la communauté Nowme, et voici ce qui t'attend :</p>
          
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 10px;">✨ <strong>Des événements exclusifs</strong> entre filles</li>
            <li style="margin-bottom: 10px;">🎁 <strong>Des réductions jusqu'à -70%</strong> chez nos partenaires</li>
            <li style="margin-bottom: 10px;">💬 <strong>Une communauté bienveillante</strong> pour échanger</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://club.nowme.fr/tous-les-kiffs" style="background-color: #db2777; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
              Découvrir les kiffs du moment
            </a>
          </div>

          <p>Si tu as la moindre question, n'hésite pas à répondre à cet email.</p>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
            À très vite,<br>
            L'équipe Nowme 💕
          </p>
        </div>
      `
        });

        if (error) {
            console.error("❌ Resend Error:", error);
            return new Response(JSON.stringify({ error }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log("✅ Email sent successfully:", data);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("❌ Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
