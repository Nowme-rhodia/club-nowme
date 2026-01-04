import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json();
        const { record } = payload;
        const { user_id, phone, location, motivation_text, email } = record || {};

        if (!phone) {
            throw new Error("Phone number is missing");
        }

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Fetch admins
        const { data: admins, error: adminError } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('is_admin', true);

        if (adminError) {
            console.error("Error fetching admins:", adminError);
        }

        // Default admins + dynamic ones
        const defaultAdmins = ["rhodia.kw@gmail.com", "admin@admin.fr"];
        const dynamicAdmins = admins?.map(a => a.email).filter(e => e) || [];

        // Merge and deduplicate
        const recipients = [...new Set([...defaultAdmins, ...dynamicAdmins])];

        console.log("Sending notification to:", recipients);

        const text = `
Nouvelle Ambassadrice Potentielle !

📍 Quartier : ${location}
📧 Email : ${email}
📞 Téléphone : ${phone}

💡 Motivation :
${motivation_text}

Action requise : Contacte-la rapidement pour valider son profil !
Accéder au Dashboard: https://club.nowme.fr/admin
`;

        const { data, error } = await resend.emails.send({
            from: 'NowMe <onboarding@nowme.fr>',
            to: recipients,
            reply_to: email, // Set reply-to
            subject: `Nouvelle Candidature Ambassadrice : ${location}`,
            html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #db2777;">Nouvelle Ambassadrice Potentielle ! 🚀</h1>
          <p>Un nouveau profil vient de postuler pour rejoindre l'équipe des ambassadrices.</p>
          
          <div style="background: #fdf2f8; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p><strong>📍 Quartier :</strong> ${location}</p>
            <p><strong>📧 Email :</strong> <a href="mailto:${email}" style="color: #db2777; font-weight: bold;">${email}</a></p>
            <p><strong>📞 Téléphone :</strong> <a href="tel:${phone}" style="color: #db2777; font-weight: bold;">${phone}</a></p>
            <p><strong>💡 Motivation :</strong></p>
            <blockquote style="border-left: 4px solid #db2777; padding-left: 15px; margin-left: 0; color: #555;">
              ${motivation_text}
            </blockquote>
          </div>

          <p><strong>Action requise :</strong> Contacte-la rapidement (dans l'heure) pour valider son profil !</p>
          
          <a href="https://club.nowme.fr/admin" style="background: #db2777; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Accéder au Dashboard
          </a>
        </div>
      `,
            text: text,
        });

        if (error) {
            console.error("Resend Error:", error);
            return new Response(JSON.stringify({ error }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
