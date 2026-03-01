import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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
        // 1. Determine Target Month (Previous Month)
        const now = new Date();
        // Go back to the 1st of previous month to cover full month
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = prevMonthDate.getFullYear();
        const monthIndex = prevMonthDate.getMonth(); // 0-11
        // Month name in French
        const monthName = prevMonthDate.toLocaleDateString('fr-FR', { month: 'long' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        // Calculate Variation Index (1-4)
        // Using monthIndex (0=Jan) -> (0 % 4) + 1 = 1
        const variationIndex = (monthIndex % 4) + 1; // 1, 2, 3, 4

        console.log(`Processing Monthly Recap for ${capitalizedMonth} ${year} (Variation ${variationIndex})`);

        // Date Ranges
        const startOfMonth = new Date(year, monthIndex, 1).toISOString();
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

        // 2. Fetch All Active Subscribers
        // TODO: Ideally use a cleaner list or view, but fetching profiles with 'subscriber' role is standard.
        // Assuming 'active' subscription check if possible, or just all profiles.
        // Let's rely on 'subscription_status' = 'active' if it exists, or just send to all profiles for now (MVP).
        // checking user_profiles schema... assumes subscription_status exists or similar.
        const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, email, first_name')
            .is('partner_id', null)
            .or('is_admin.is.null,is_admin.eq.false')
            .not('email', 'is', null);

        if (profilesError) throw profilesError;

        if (!profiles || profiles.length === 0) {
            return new Response(JSON.stringify({ message: "No profiles found" }), { headers: corsHeaders });
        }

        let statsSent = { high: 0, medium: 0, zero: 0, total: 0 };

        // 3. Loop through subscribers
        for (const profile of profiles) {
            // Fetch Bookings (Paid)
            const { count: bookingCount, error: bookingError } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.user_id)
                .eq('status', 'paid')
                .gte('created_at', startOfMonth)
                .lte('created_at', endOfMonth);

            // Fetch Squad Participation (Attended)
            // Need to query squad_members -> micro_squads.
            // Doing this per user is N+1 but safe for small MVP batch.
            const { data: squadParticipation, error: squadError } = await supabase
                .from('squad_members')
                .select(`
                micro_squads!inner(date_event)
            `)
                .eq('user_id', profile.user_id)
                .gte('micro_squads.date_event', startOfMonth)
                .lte('micro_squads.date_event', endOfMonth);

            const squadCount = squadParticipation ? squadParticipation.length : 0;
            const totalActivity = (bookingCount || 0) + squadCount;

            // Determine Scenario
            let scenario = 'C'; // Zero
            if (totalActivity > 3) scenario = 'A'; // High
            else if (totalActivity >= 1) scenario = 'B'; // Medium

            // Get Email Content
            const content = getEmailContent(scenario, variationIndex, profile.first_name || 'La Kiffeuse', capitalizedMonth, (bookingCount || 0), squadCount);

            // Send Email
            await resend.emails.send({
                from: 'Club Nowme <equipe@nowme.fr>',
                to: profile.email,
                subject: content.subject,
                html: content.html
            });

            if (scenario === 'A') statsSent.high++;
            else if (scenario === 'B') statsSent.medium++;
            else statsSent.zero++;
            statsSent.total++;
        }

        return new Response(JSON.stringify({ message: "Monthly Recaps Sent", stats: statsSent }), {
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

// Helper to Generate Content
function getEmailContent(scenario: string, variation: number, name: string, month: string, kiffs: number, squads: number) {
    const commonStyle = `font-family: sans-serif; color: #333; line-height: 1.6;`;

    // Common Footer with CTA and Signature
    const footer = `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="text-align: center;">
                <a href="https://club-nowme.vercel.app/tous-les-kiffs" style="background-color: #db2777; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Découvrir les nouveaux Kiffs</a>
            </p>
            <p style="margin-top: 30px;">
                Avec beaucoup de kiff,<br/>
                <strong>Nowme</strong>
            </p>
        </div>
    `;

    // SCENARIO A: > 3 Activities
    if (scenario === 'A') {
        if (variation === 1) {
            return {
                subject: `Wow ${name}, quel mois de folie ! 🔥`,
                html: `<div style="${commonStyle}">
                       <p>Coucou ${name} !</p>
                       <p>On t'arrête plus dis-donc ! En ${month}, tu as été <em>on fire</em> :</p>
                       <ul>
                        <li>✨ <strong>${kiffs}</strong> Kiffs dégotés</li>
                        <li>👯‍♀️ <strong>${squads}</strong> Sorties entre filles</li>
                       </ul>
                       <p>Merci d'apporter cette énergie incroyable au Club. C'est un bonheur de te voir rayonner et profiter à fond.</p>
                       <p>Prête pour la suite ? Ton agenda t'attend !</p>
                       ${footer}
                       </div>`
            };
        }
        if (variation === 2) {
            return {
                subject: `${name}, tu nous inspires ! ✨`,
                html: `<div style="${commonStyle}">
                       <p>Hello ${name},</p>
                       <p>Juste un mot pour te dire bravo. Ton activité en ${month} fait plaisir à voir !</p>
                       <p>Tu profites à fond de l'expérience et ça motive tout le monde autour de toi.</p>
                       <p>Continue de croquer le Club à pleines dents !</p>
                       ${footer}
                       </div>`
            };
        }
        if (variation === 3) {
            return {
                subject: `Le Club ne serait pas pareil sans toi ❤️`,
                html: `<div style="${commonStyle}">
                       <p>Coucou ${name},</p>
                       <p>On faisait le bilan de ${month} et... waouh !</p>
                       <p>Merci d'être aussi présente et investie. C'est grâce à des membres comme toi que la magie opère.</p>
                       <p>On a hâte de te retrouver pour tes prochaines aventures !</p>
                       ${footer}
                       </div>`
            };
        }
        return { // Variation 4
            subject: `Ton énergie est contagieuse, ${name} ! ⚡`,
            html: `<div style="${commonStyle}">
                    <p>Hello la Kiffeuse !</p>
                    <p>Tu as encore vécu un mois intense avec nous et on adore ça.</p>
                    <p>Ne change rien, ton enthousiasme est notre plus belle récompense.</p>
                    <p>Alors, quel sera ton prochain coup de cœur ?</p>
                    ${footer}
                    </div>`
        };
    }

    // SCENARIO B: 1-3 Activities
    if (scenario === 'B') {
        if (variation === 1) {
            return {
                subject: `De jolis moments partagés, ${name} ✨`,
                html: `<div style="${commonStyle}">
                       <p>Coucou ${name},</p>
                       <p>Quel plaisir de t'avoir vue profiter du Club en ${month} !</p>
                       <p>C'est si important de s'accorder ces moments pour soi... ✨ <strong>${kiffs}</strong> Kiffs, 👯‍♀️ <strong>${squads}</strong> Sorties.</p>
                       <p>On a déjà hâte de te retrouver pour ta prochaine pause bien-être.</p>
                       ${footer}
                       </div>`
            };
        }
        if (variation === 2) {
            return {
                subject: `La dose parfaite de bonheur 💫`,
                html: `<div style="${commonStyle}">
                       <p>Hello ${name},</p>
                       <p>Tu as trouvé le rythme parfait en ${month} !</p>
                       <p>Juste ce qu'il faut de sorties et de kiffs pour se ressourcer sans se presser.</p>
                       <p>Bravo de prendre ce temps précieux pour toi. Tu le mérites.</p>
                       ${footer}
                       </div>`
            };
        }
        if (variation === 3) {
            return {
                subject: `Ces petits instants qui comptent... 🌸`,
                html: `<div style="${commonStyle}">
                       <p>Coucou ${name},</p>
                       <p>Merci d'avoir partagé ces jolis moments avec nous le mois dernier.</p>
                       <p>Chaque sourire, chaque échange compte. On est ravies que tu aies pu t'évader un peu avec le Club.</p>
                       <p>À très vite pour de nouveaux souvenirs !</p>
                       ${footer}
                       </div>`
            };
        }
        return { // Variation 4
            subject: `On remet ça, ${name} ? 🥂`,
            html: `<div style="${commonStyle}">
                    <p>Hello !</p>
                    <p>C'était top de te croiser en ${month}.</p>
                    <p>On espère que ces quelques kiffs t'ont fait du bien au moral.</p>
                    <p>N'oublie pas : le Club est là dès que tu as envie d'une nouvelle parenthèse enchantée.</p>
                    ${footer}
                    </div>`
        };
    }

    // SCENARIO C: 0 Activity (Zero)
    // variation 1 (Original)
    if (variation === 1) {
        return {
            subject: `On pense à toi, ${name} ❤️`,
            html: `<div style="${commonStyle}">
                   <p>Coucou ${name},</p>
                   <p>Un petit mot pour prendre des nouvelles. On sait que la vie va à 100 à l'heure...</p>
                   <p>On te comprend et on te soutient. Le Club, c'est aussi être là sans pression.</p>
                   <p>Quand tu auras envie de souffler, ta place sera toujours au chaud. Prends soin de toi.</p>
                   ${footer}
                   </div>`
        };
    }
    if (variation === 2) {
        return {
            subject: `Juste un petit coucou bienveillant 💌`,
            html: `<div style="${commonStyle}">
                   <p>Hello ${name},</p>
                   <p>On passait par là et on voulait juste t'envoyer un peu d'ondes positives.</p>
                   <p>Pas de pression, pas d'obligation. Juste l'envie de te dire qu'on ne t'oublie pas.</p>
                   <p>Reviens-nous quand le moment sera le bon pour toi. On sera là.</p>
                   ${footer}
                   </div>`
        };
    }
    if (variation === 3) {
        return {
            subject: `${name}, prends le temps qu'il faut 🕰️`,
            html: `<div style="${commonStyle}">
                   <p>Coucou ${name},</p>
                   <p>Parfois, il faut savoir appuyer sur pause, et c'est très bien comme ça.</p>
                   <p>Ne culpabilise surtout pas d'être moins présente. Chacune son rythme, chacune sa vie.</p>
                   <p>Le Club restera ton petit refuge, prêt à t'accueillir le jour J.</p>
                   ${footer}
                   </div>`
        };
    }
    return { // Variation 4
        subject: `Ta place est toujours là 💕`,
        html: `<div style="${commonStyle}">
                <p>Hello ${name},</p>
                <p>On espère que ton mois s'est bien passé.</p>
                <p>Même de loin, tu fais partie de la bande.</p>
                <p>Si l'envie te prend de venir papoter ou te changer les idées le mois prochain, la porte est grande ouverte.</p>
                <p>À bientôt (quand tu veux) !</p>
                ${footer}
                </div>`
    };
}
