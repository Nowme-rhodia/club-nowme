import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const now = new Date();
        // Helper to get date string YYYY-MM-DD
        const getDateStr = (d: Date) => d.toISOString().split('T')[0];

        const d7 = new Date(now); d7.setDate(now.getDate() + 7);
        const d3 = new Date(now); d3.setDate(now.getDate() + 3);

        const str7d = getDateStr(d7);
        const str3d = getDateStr(d3);

        console.log(`Processing reminders for J-7 (${str7d}) and J-3 (${str3d})`);

        // 1. Process J-7 Reminders
        const { data: squads7d, error: error7d } = await supabase
            .from('micro_squads')
            .select(`
        id, 
        title, 
        date_event, 
        location,
        squad_members (
          user_profiles (
            email,
            first_name
          )
        )
      `)
            .gte('date_event', `${str7d}T00:00:00`)
            .lte('date_event', `${str7d}T23:59:59`)
            .is('reminder_7d_sent_at', null);

        if (error7d) throw error7d;

        if (squads7d && squads7d.length > 0) {
            console.log(`Found ${squads7d.length} squads for J-7 reminder.`);
            for (const squad of squads7d) {
                if (!squad.squad_members || squad.squad_members.length === 0) continue;

                const eventDate = new Date(squad.date_event).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const recipients = squad.squad_members
                    .map((m: any) => m.user_profiles)
                    .filter((p: any) => p && p.email);

                for (const member of recipients) {
                    const { email, first_name } = member;
                    if (!email) continue;

                    await resend.emails.send({
                        from: 'Club Nowme <equipe@nowme.fr>',
                        to: email,
                        subject: `J-7 : Ta sortie ${squad.title} approche ! 👯‍♀️`,
                        html: `
                  <div style="font-family: sans-serif; color: #333;">
                    <p>Coucou ${first_name || 'La Kiffeuse'} !</p>
                    <p>Plus que quelques jours avant ta sortie <strong>${squad.title}</strong> ! C'est le moment de chauffer le groupe WhatsApp ! 🔥</p>
                    
                    <div style="background: #fdf2f8; padding: 20px; border-radius: 12px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #db2777;">Rappel du RDV :</h3>
                        <p style="margin: 5px 0;">📅 ${eventDate}</p>
                        <p style="margin: 5px 0;">📍 ${squad.location}</p>
                    </div>

                    <p><strong>Le petit rappel bienveillance :</strong><br/>
                    Au Club, on vient comme on est, avec son sourire et sa bonne humeur. L'objectif ? Passer un moment 100% déconnexion et sororité. On compte sur toi pour accueillir les nouvelles comme des reines ! 👑</p>

                    <p>On a trop hâte de voir vos photos (n'oublie pas de nous taguer !).</p>

                    <p>À très vite,<br/><strong>La Team Nowme</strong></p>
                  </div>
                `
                    });
                }

                // Mark as sent
                await supabase
                    .from('micro_squads')
                    .update({ reminder_7d_sent_at: new Date().toISOString() })
                    .eq('id', squad.id);
            }
        }

        // 2. Process J-3 Reminders
        const { data: squads3d, error: error3d } = await supabase
            .from('micro_squads')
            .select(`
        id, 
        title, 
        date_event, 
        location,
        squad_members (
          user_profiles (
            email,
            first_name
          )
        )
      `)
            .gte('date_event', `${str3d}T00:00:00`)
            .lte('date_event', `${str3d}T23:59:59`)
            .is('reminder_3d_sent_at', null);

        if (error3d) throw error3d;

        if (squads3d && squads3d.length > 0) {
            console.log(`Found ${squads3d.length} squads for J-3 reminder.`);
            for (const squad of squads3d) {
                if (!squad.squad_members || squad.squad_members.length === 0) continue;

                const eventDate = new Date(squad.date_event).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const recipients = squad.squad_members
                    .map((m: any) => m.user_profiles)
                    .filter((p: any) => p && p.email);

                for (const member of recipients) {
                    const { email, first_name } = member;
                    if (!email) continue;

                    // NOTE: Using slightly different 'J-3' copy (same structure, slight variation if desired, but sticking to reviewed template logic)
                    // User authorized "Rappel Sortie (J-7 et J-3)" with one template. I'll use the same well-crafted template.
                    await resend.emails.send({
                        from: 'Club Nowme <equipe@nowme.fr>',
                        to: email,
                        subject: `J-3 : Ta sortie ${squad.title}, c'est bientôt ! 👯‍♀️`,
                        html: `
                  <div style="font-family: sans-serif; color: #333;">
                    <p>Coucou ${first_name || 'La Kiffeuse'} !</p>
                    <p>C'est presque le jour J pour <strong>${squad.title}</strong> ! On espère que tu es prête. 🔥</p>
                    
                    <div style="background: #fdf2f8; padding: 20px; border-radius: 12px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #db2777;">Rappel du RDV :</h3>
                        <p style="margin: 5px 0;">📅 ${eventDate}</p>
                        <p style="margin: 5px 0;">📍 ${squad.location}</p>
                    </div>

                    <p><strong>Le petit rappel bienveillance :</strong><br/>
                    Au Club, on vient comme on est, avec son sourire et sa bonne humeur. L'objectif ? Passer un moment 100% déconnexion et sororité. On compte sur toi pour accueillir les nouvelles comme des reines ! 👑</p>

                    <p>On a trop hâte de voir vos photos (n'oublie pas de nous taguer !).</p>

                    <p>À très vite,<br/><strong>La Team Nowme</strong></p>
                  </div>
                `
                    });
                }

                // Mark as sent
                await supabase
                    .from('micro_squads')
                    .update({ reminder_3d_sent_at: new Date().toISOString() })
                    .eq('id', squad.id);
            }
        }

        return new Response(JSON.stringify({
            message: "Reminders processed",
            stats: { j7: squads7d?.length, j3: squads3d?.length }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
