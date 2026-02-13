import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
        console.log("🚀 Starting Booking Reminders (D-1)...");

        // 1. Calculate Target Date Range (Tomorrow)
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        // 2. Fetch Bookings
        const { data: bookings, error } = await supabase
            .from("bookings")
            .select(`
                id,
                booking_date,
                meeting_location,
                variants:variant_id ( name ),
                offers (
                    title,
                    partners ( business_name, address, phone )
                ),
                user_profiles ( email, first_name )
            `)
            .gte("booking_date", tomorrowStart.toISOString())
            .lte("booking_date", tomorrowEnd.toISOString())
            .in("status", ["confirmed", "paid"]);

        if (error) throw error;
        if (!bookings || bookings.length === 0) {
            console.log("No bookings found for tomorrow.");
            return new Response(JSON.stringify({ message: "No bookings found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        console.log(`Found ${bookings.length} bookings for tomorrow.`);

        const results = [];

        // 3. Send Emails
        for (const booking of bookings) {
            // @ts-ignore
            const userEmail = booking.user_profiles?.email;
            // @ts-ignore
            const userName = booking.user_profiles?.first_name || "Kiffeuse";
            // @ts-ignore
            const offerTitle = booking.offers?.title;
            // @ts-ignore
            const partnerName = booking.offers?.partners?.business_name;
            // @ts-ignore
            const address = booking.meeting_location || booking.offers?.partners?.address;

            if (!userEmail) continue;

            const time = new Date(booking.booking_date!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

            const htmlContent = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #BE185D;">C'est demain ! ✨</h1>
                    <p>Bonjour ${userName},</p>
                    <p>Votre moment chez <strong>${partnerName}</strong> arrive à grands pas.</p>
                    
                    <div style="background-color: #FDF2F8; padding: 20px; border-radius: 8px; border-left: 4px solid #BE185D; margin: 20px 0;">
                        <h2 style="margin-top: 0; font-size: 18px;">${offerTitle}</h2>
                        <p><strong>📅 Date :</strong> Demain à ${time}</p>
                        <p><strong>📍 Lieu :</strong> ${address}</p>
                    </div>

                    <p>Profitez bien de ce moment !</p>
                    <p style="font-size: 12px; color: #888; margin-top: 30px;">
                        L'équipe Nowme 💕
                    </p>
                </div>
            `;

            try {
                await resend.emails.send({
                    from: "Nowme Club <contact@nowme.fr>",
                    to: [userEmail],
                    subject: `Rappel : Votre expérience chez ${partnerName} est pour demain !`,
                    html: htmlContent,
                });
                results.push({ id: booking.id, status: "sent" });
            } catch (err) {
                console.error(`Error sending to ${userEmail}:`, err);
                results.push({ id: booking.id, status: "error", error: err });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
