import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    try {
        console.log("🚀 Starting Re-engagement Campaign...");

        // 1. Identify Target Users (> 90 days inactive)
        // We look for users who have NO bookings in the last 90 days.
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Fetch all users first (pagination might be needed for large scale, but fine for now)
        const { data: users, error: userError } = await supabase
            .from("user_profiles")
            .select("user_id, email, first_name")
            .not("email", "is", null);

        if (userError) throw userError;

        // Fetch recent bookings (last 90 days)
        const { data: recentBookings, error: bookingError } = await supabase
            .from("bookings")
            .select("user_id")
            .gte("created_at", ninetyDaysAgo.toISOString());

        if (bookingError) throw bookingError;

        const activeUserIds = new Set(recentBookings?.map(b => b.user_id));
        const inactiveUsers = users?.filter(u => !activeUserIds.has(u.user_id)) || [];

        console.log(`Found ${inactiveUsers.length} inactive users.`);

        // 2. Filter out those already contacted recently
        // We check 'emails' table for subject "Vous nous manquez" sent in last 90 days
        const { data: sentEmails } = await supabase
            .from("emails")
            .select("to_address")
            .eq("subject", "Tu nous manques ! 💔")
            .gte("created_at", ninetyDaysAgo.toISOString());

        const contactedEmails = new Set(sentEmails?.map(e => e.to_address));
        const finalTargets = inactiveUsers.filter(u => !contactedEmails.has(u.email));

        console.log(`Sending to ${finalTargets.length} users after filtering.`);

        const results = [];

        // 3. Send Emails (Batch of 50 to avoid timeouts)
        const batch = finalTargets.slice(0, 50);

        for (const user of batch) {
            if (!user.email) continue;

            const htmlContent = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; text-align: center;">
                    <h1 style="color: #BE185D;">Tu nous manques ! 💔</h1>
                    <p>Bonjour ${user.first_name || "la Kiffeuse"},</p>
                    
                    <p>Ça fait un petit moment qu'on ne t'a pas vue sur le Club.</p>
                    <p>De nombreuses nouveautés sont arrivées depuis ta dernière visite : nouveaux spas, ateliers, restaurants...</p>

                    <div style="margin: 30px 0;">
                        <a href="https://club.nowme.fr/categories" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                            Découvrir les nouveautés
                        </a>
                    </div>
                    
                    <p>On espère te revoir très vite !</p>
                </div>
            `;

            try {
                await resend.emails.send({
                    from: "Nowme Club <contact@nowme.fr>",
                    to: [user.email],
                    subject: "Tu nous manques ! 💔",
                    html: htmlContent,
                });

                // Log the email so we don't spam
                await supabase.from("emails").insert({
                    to_address: user.email,
                    subject: "Tu nous manques ! 💔", // Must match the filter query above
                    content: "Re-engagement email",
                    status: "sent"
                });

                results.push({ email: user.email, status: "sent" });
            } catch (err) {
                console.error(`Error sending to ${user.email}:`, err);
                results.push({ email: user.email, status: "error" });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results.length }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
