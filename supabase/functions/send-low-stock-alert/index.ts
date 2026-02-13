import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    try {
        console.log("🚀 Starting Low Stock Alerts...");

        // 1. Find Variants with Low Stock
        const { data: variants, error } = await supabase
            .from("offer_variants")
            .select(`
                id,
                name,
                stock,
                offers!inner (
                    title,
                    status,
                    partners!inner (
                        business_name,
                        contact_email,
                        contact_name
                    )
                )
            `)
            .gt("stock", 0)
            .lte("stock", 5)
            .eq("offers.status", "active");

        if (error) throw error;
        if (!variants || variants.length === 0) {
            return new Response("No low stock items", { status: 200 });
        }

        const results = [];

        // 2. Process Alerts
        for (const variant of variants) {
            // @ts-ignore
            const partner = variant.offers.partners;
            // @ts-ignore
            const offerTitle = variant.offers.title;

            if (!partner.contact_email) continue;

            // Check if we already alerted for this variant recently (e.g., last 3 days)
            // Using 'emails' table again as audit log
            const { data: recentAlerts } = await supabase
                .from("emails")
                .select("id")
                .eq("to_address", partner.contact_email)
                .ilike("subject", `%Stock Faible%${offerTitle}%`)
                .gte("created_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

            if (recentAlerts && recentAlerts.length > 0) {
                console.log(`Skipping ${offerTitle} (alert sent recently)`);
                continue;
            }

            const htmlContent = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #E11D48;">⚠️ Stock Faible : ${offerTitle}</h2>
                    <p>Bonjour ${partner.contact_name || partner.business_name},</p>
                    
                    <p>Il ne reste plus que <strong>${variant.stock} places</strong> pour votre option <strong>${variant.name}</strong>.</p>
                    
                    <p>C'est une super nouvelle, votre offre plait ! 🎉</p>
                    <p>Pour ne pas manquer de ventes, pensez à remettre du stock si vous le pouvez.</p>

                    <div style="margin: 30px 0;">
                        <a href="https://club.nowme.fr/partner/dashboard" style="background-color: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                            Gérer mon stock
                        </a>
                    </div>
                </div>
            `;

            try {
                await resend.emails.send({
                    from: "Nowme Partner <contact@nowme.fr>",
                    to: [partner.contact_email],
                    subject: `⚠️ Stock Faible : ${offerTitle}`,
                    html: htmlContent,
                });

                // Log it
                await supabase.from("emails").insert({
                    to_address: partner.contact_email,
                    subject: `⚠️ Stock Faible : ${offerTitle}`,
                    content: `Low stock alert for ${variant.id}`,
                    status: "sent"
                });

                results.push({ variant: variant.id, status: "sent" });
            } catch (err) {
                console.error(err);
                results.push({ variant: variant.id, status: "error" });
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
