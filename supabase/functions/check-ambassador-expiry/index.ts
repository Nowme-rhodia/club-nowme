import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const adminEmail = Deno.env.get("GMAIL_EMAIL") || "rhodia@nowme.fr";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Calculate the Threshold Date (5.5 months ago)
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - 5);
        thresholdDate.setDate(thresholdDate.getDate() - 15);
        const thresholdIso = thresholdDate.toISOString();

        console.log(`Checking for mandates started before: ${thresholdIso}`);

        // 2. Find Ambassadors who need reminding
        const { data: users, error } = await supabase
            .from("user_profiles")
            .select("user_id, email, first_name, last_name, ambassador_start_date")
            .eq("is_ambassador", true)
            .lt("ambassador_start_date", thresholdIso)
            .is("ambassador_last_reminder_at", null);

        if (error) throw error;

        console.log(`Found ${users.length} ambassadors to remind.`);

        const results = [];
        const processedAdmins = new Set<string>();

        // 3. Fetch all Admin Emails once
        const { data: adminProfiles } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("is_admin", true);

        const adminEmails = new Set<string>();
        if (adminEmail) adminEmails.add(adminEmail);

        if (adminProfiles) {
            adminProfiles.forEach((p: any) => {
                if (p.email) adminEmails.add(p.email);
            });
        }
        const targetAdmins = Array.from(adminEmails);
        console.log(`Targeting admins: ${targetAdmins.join(', ')}`);


        // 4. Process each ambassador
        for (const user of users) {
            if (!user.email) continue;
            const userName = user.first_name || "Ambassadrice";
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

            // Email to Ambassador
            try {
                const resUser = await resend.emails.send({
                    from: "Nowme <contact@nowme.fr>",
                    to: [user.email],
                    subject: "Ton mandat arrive bientôt à échéance ! ⏳",
                    html: `
                     <div style="font-family: sans-serif; color: #333;">
                         <h1>Coucou ${userName} !</h1>
                         <p>Cela fait déjà 5 mois et demi que tu as débuté ton mandat d'Ambassadrice. Le temps passe vite ! 🚀</p>
                         <p>Il ne te reste que 2 semaines avant la fin de ton cycle de 6 mois.</p>
                         <p><strong>C'est le moment d'organiser un point avec ton admin</strong> pour faire le bilan et nous dire si tu souhaites continuer à kiffer avec nous !</p>
                         <p>Envoie-nous vite un message pour qu'on en discute.</p>
                         <p>À très vite,<br>L'équipe Nowme</p>
                     </div>
                 `
                });
                if (resUser.error) {
                    console.error(`Error sending to user ${user.email}:`, resUser.error);
                } else {
                    results.push(user.email);
                }
            } catch (errUser) {
                console.error(`Exception sending to user ${user.email}:`, errUser);
            }

            // Wait 1s
            await sleep(1000);

            // Email to Admins (loop)
            for (const targetEmail of targetAdmins) {
                try {
                    console.log(`Sending admin notification to: ${targetEmail}`);
                    const res = await resend.emails.send({
                        from: "Nowme <contact@nowme.fr>",
                        to: [targetEmail],
                        subject: `[Admin] Fin de mandat imminente : ${fullName}`,
                        html: `
                         <div style="font-family: sans-serif; color: #333;">
                             <h1>Alerte Fin de Mandat</h1>
                             <p>Le mandat de l'ambassadrice <strong>${fullName}</strong> (${user.email}) a commencé le ${new Date(user.ambassador_start_date).toLocaleDateString()}.</p>
                             <p>Cela fait 5 mois et demi.</p>
                             <p>Il est temps de faire un point avec elle pour savoir si elle souhaite renouveler ou arrêter.</p>
                             <p><a href="https://club.nowme.fr/admin/ambassadors">Gérer les ambassadrices</a></p>
                         </div>
                     `
                    });

                    if (res.error) {
                        console.error(`Resend API Error for ${targetEmail}:`, res.error);
                    } else {
                        console.log(`Admin notification sent successfully to ${targetEmail} (ID: ${res.data?.id})`);
                        processedAdmins.add(targetEmail);
                    }

                } catch (adminErr) {
                    console.error(`Failed to send admin notification to ${targetEmail}:`, adminErr);
                }

                // Wait 1s between admin emails
                await sleep(1000);
            }

            // Update Last Reminder
            await supabase
                .from("user_profiles")
                .update({ ambassador_last_reminder_at: new Date().toISOString() })
                .eq("user_id", user.user_id);
        }

        return new Response(
            JSON.stringify({ success: true, processed: results, processedAdmins: Array.from(processedAdmins) }),
            { headers: { "Content-Type": "application/json" }, status: 200 }
        );

    } catch (error: any) {
        console.error("Cron Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { "Content-Type": "application/json" }, status: 500 }
        );
    }
});
