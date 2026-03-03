import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=denonext";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    try {
        console.log("🚀 Starting Weekly Recap generation...");

        // 1. Fetch new content from the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString();

        // Step 0: Identify Official Partners to safely split offers
        const { data: officialPartners, error: officialPartnersError } = await supabase
            .from("partners")
            .select("id")
            .eq("is_official", true);

        if (officialPartnersError) {
            console.error("Error fetching official partners:", officialPartnersError);
            return new Response("Error fetching official partners", { status: 500 });
        }

        const officialPartnerIds = officialPartners?.map(p => p.id) || [];

        // A. Fetch Official Offers
        let officialOffers: any[] = [];
        if (officialPartnerIds.length > 0) {
            const { data, error } = await supabase
                .from("offers")
                .select("title, description, image_url, id")
                .eq("status", "approved")
                .gt("created_at", oneWeekAgoStr)
                .in("partner_id", officialPartnerIds)
                .limit(3);

            if (error) throw error;
            officialOffers = data || [];
        }

        // B. Fetch Regular New Offers (excluding official ones)
        let query = supabase
            .from("offers")
            .select("title, description, image_url, id, partners!inner(business_name)") // Select partner name too just in case
            .eq("status", "approved")
            .gt("created_at", oneWeekAgoStr);

        if (officialPartnerIds.length > 0) {
            // content.not('partner_id', 'in', `(${officialPartnerIds.join(',')})`) // Supabase syntax requires simpler array?
            // Actually .not('partner_id', 'in', officialPartnerIds) might strict check.
            // Safer way: .filter('partner_id', 'not.in', `(${officialPartnerIds.join(',')})`)
            // Ideally: .not('partner_id', 'in', officialPartnerIds) works if correctly typed.
            // Let's use the explicit filter string format to be safe with arrays in raw Postgrest if needed, 
            // but JS client supports array for 'in'. For 'not.in', we use .not('partner_id', 'in', officialPartnerIds) matches documentation?
            // "filter(column, operator, value): Match a column against a value (not, in)" -> .not(column, operator, value)
            query = query.not("partner_id", "in", `(${officialPartnerIds.join(',')})`);
        }

        const { data: newOffers, error: offersError } = await query.limit(3);

        // C. Fetch New Partners
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

        const hasOfficial = officialOffers && officialOffers.length > 0;
        const hasRegular = newOffers && newOffers.length > 0;
        const hasPartners = newPartners && newPartners.length > 0;

        if (!hasOfficial && !hasRegular && !hasPartners) {
            console.log("No new content this week. Skipping recap.");
            return new Response("No new content found", { status: 200 });
        }

        // 2. Fetch subscribed users (Payants + Invités ONLY)
        // We exclude partners by checking partner_id is NULL
        const { data: subscribers, error: usersError } = await supabase
            .from("user_profiles")
            .select("email, first_name")
            .eq("sub_auto_recap", true)
            .is("partner_id", null) // Exclude partners
            .or('is_admin.is.null,is_admin.eq.false') // Exclude admins
            .not("email", "is", null);

        if (usersError || !subscribers) {
            console.error("Error fetching subscribers:", usersError);
            return new Response("Error fetching subscribers", { status: 500 });
        }

        console.log(`📧 Sending recap to ${subscribers.length} subscribers.`);

        // 3. Generate Email Logic (Batch sending)
        const emailSubject = "🔥 Le Récap des Kiffs de la semaine !";

        const introMessages = [
            "Prête pour ta dose hebdomadaire de kiffs ? Voici les nouveautés !",
            "Quoi de neuf sur le Club ? On t'a déniché des pépites pour cette semaine.",
            "Le mardi, c'est permis ! Découvre les dernières sorties et offres exclusives.",
            "Hello ! Une nouvelle semaine commence, et avec elle de nouveaux bons plans Nowme.",
            "Ne passe pas à côté ! Voici ce qui vient d'arriver sur le Club.",
            "Ta semaine mérite un peu de piment. Regarde ce qu'on te propose !"
        ];

        const randomIntro = introMessages[Math.floor(Math.random() * introMessages.length)];

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
                  <p>${randomIntro}</p>
              </div>

              ${hasRegular ? `
                  <div class="section-title">✨ Nouveaux Kiffs</div>
                  ${newOffers.map(offer => `
                      <div class="card">
                          <h3>${offer.title}</h3>
                          <p>${offer.description ? offer.description.substring(0, 100) + '...' : ''}</p>
                      </div>
                  `).join('')}
              ` : ''}

              ${hasOfficial ? `
                  <div class="section-title">🏆 Kiffs Officiels</div>
                  ${officialOffers.map(offer => `
                      <div class="card">
                          <h3>${offer.title}</h3>
                          <p>${offer.description ? offer.description.substring(0, 100) + '...' : ''}</p>
                      </div>
                  `).join('')}
              ` : ''}

              ${hasPartners ? `
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
                  <p>Pour gérer tes préférences, rendez-vous dans ton <a href="https://club.nowme.fr/mon-compte/parametres">espace membre</a>.</p>
              </div>
          </div>
      </body>
      </html>
    `;

        let sentCount = 0;
        const chunkSize = 20;

        for (let i = 0; i < subscribers.length; i += chunkSize) {
            const chunk = subscribers.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (user) => {
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
            }));
        }

        // 4. Log the recap in admin_newsletters for tracking
        try {
            await supabase.from("admin_newsletters").insert({
                subject: `[AUTO-RECAP] ${emailSubject}`,
                body: `Automated Weekly Recap sent to ${sentCount} subscribers.`,
                status: 'sent',
                sent_at: new Date().toISOString(),
                scheduled_at: new Date().toISOString()
            });
        } catch (logError) {
            console.error("Failed to log recap in admin_newsletters:", logError);
            // Don't fail the whole function if logging fails
        }

        return new Response(JSON.stringify({ success: true, count: sentCount }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Critical error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
