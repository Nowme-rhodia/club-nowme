import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    // Authorization Check (for manual trigger support or cron)
    // Note: For cron triggers, Supabase calls this internally but authentication via Service Key is implicit in the client setup.
    // We can add a simple header check if we want to secure the endpoint from public calls.

    try {
        console.log("🚀 Starting Weekly Recap generation...");

        // 1. Fetch new content from the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString();

        // Fetch New Approved Offers
        const { data: newOffers, error: offersError } = await supabase
            .from("offers")
            .select("title, description, image_url, id")
            .eq("status", "approved")
            .gt("created_at", oneWeekAgoStr)
            .limit(3);

        // Fetch New Partners
        const { data: newPartners, error: partnersError } = await supabase
            .from("partners")
            .select("business_name, description, id")
            .eq("status", "approved")
            .gt("created_at", oneWeekAgoStr)
            .limit(3);

        if (offersError || partnersError) {
            console.error("Error fetching content:", offersError, partnersError);
            return new Response("Error fetching content", { status: 500 });
        }

        if ((!newOffers || newOffers.length === 0) && (!newPartners || newPartners.length === 0)) {
            console.log("No new content this week. Skipping recap.");
            return new Response("No new content found", { status: 200 });
        }

        // 2. Fetch subscribed users
        const { data: subscribers, error: usersError } = await supabase
            .from("user_profiles")
            .select("email, first_name")
            .eq("sub_auto_recap", true)
            .not("email", "is", null); // Ensure email exists

        if (usersError || !subscribers) {
            console.error("Error fetching subscribers:", usersError);
            return new Response("Error fetching subscribers", { status: 500 });
        }

        console.log(`📧 Sending recap to ${subscribers.length} subscribers.`);

        // 3. Generate Email Logic (Batch sending)
        // For large lists, we should batch. Resend supports batching, or we loop.
        // For MVP, we loop but with error handling.

        const emailSubject = "🔥 Le Récap des Kiffs de la semaine !";

        const generateHtml = (firstName: string) => `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: sans-serif; color: #333; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section-title { color: #e11d48; font-size: 20px; font-weight: bold; margin-top: 30px; border-bottom: 2px solid #fecdd3; padding-bottom: 10px; }
              .card { background: #fff5f5; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
              .card h3 { margin: 0 0 5px 0; color: #be123c; }
              .footer { text-align: center; font-size: 12px; color: #888; margin-top: 40px; }
              .cta-btn { display: inline-block; background-color: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Salut ${firstName || 'la Kiffeuse'} ! 👋</h1>
                  <p>Voici ce que tu as raté cette semaine sur le Club Nowme.</p>
              </div>

              ${newOffers && newOffers.length > 0 ? `
                  <div class="section-title">✨ Nouveaux Kiffs</div>
                  ${newOffers.map(offer => `
                      <div class="card">
                          <h3>${offer.title}</h3>
                          <p>${offer.description ? offer.description.substring(0, 100) + '...' : ''}</p>
                      </div>
                  `).join('')}
              ` : ''}

              ${newPartners && newPartners.length > 0 ? `
                  <div class="section-title">🤝 Nouveaux Partenaires</div>
                  ${newPartners.map(partner => `
                      <div class="card">
                          <h3>${partner.business_name}</h3>
                          <p>${partner.description ? partner.description.substring(0, 100) + '...' : ''}</p>
                      </div>
                  `).join('')}
              ` : ''}

              <div style="text-align: center;">
                  <a href="https://club.nowme.fr/club" class="cta-btn">Voir tous les kiffs</a>
              </div>

              <div class="footer">
                  <p>Tu reçois cet email car tu es abonnée au Club Nowme.</p>
                  <p>Pour gérer tes préférences, rendez-vous dans ton espace membre.</p>
              </div>
          </div>
      </body>
      </html>
    `;

        // Process in chunks of 50 to avoid rate limits if list grows large
        // For now, simple loop is fine for < 1000 users.
        let sentCount = 0;

        // We can use Resend's Batch API if available in this SDK version, or parallel promises
        const emailPromises = subscribers.map(async (user) => {
            try {
                await resend.emails.send({
                    from: "Nowme Club <contact@nowme.fr>",
                    to: [user.email],
                    subject: emailSubject,
                    html: generateHtml(user.first_name || 'Nowme'),
                });
                sentCount++;
            } catch (e) {
                console.error(`Failed to send to ${user.email}:`, e);
            }
        });

        await Promise.all(emailPromises);

        return new Response(JSON.stringify({ success: true, count: sentCount }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Critical error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
