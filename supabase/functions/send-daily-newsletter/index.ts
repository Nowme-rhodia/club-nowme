import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface BonPlan {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  price?: number;
  discount?: string;
  author_name: string;
  likes_count: number;
  created_at: string;
  user?: { first_name: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors(req);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('🚀 Génération de la newsletter quotidienne...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: bonPlans, error: bonPlansError } = await supabase
      .from("community_posts")
      .select(`
        id, title, description, category, location, price, discount, likes_count, created_at,
        user:user_profiles(first_name)
      `)
      .eq("status", "active")
      .gte("created_at", yesterday.toISOString())
      .order("likes_count", { ascending: false })
      .limit(5);

    if (bonPlansError) throw bonPlansError;

    let finalBonPlans = bonPlans || [];

    if (finalBonPlans.length < 3) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weeklyBonPlans, error: weeklyError } = await supabase
        .from("community_posts")
        .select(`
          id, title, description, category, location, price, discount, likes_count, created_at,
          user:user_profiles(first_name)
        `)
        .eq("status", "active")
        .gte("created_at", weekAgo.toISOString())
        .order("likes_count", { ascending: false })
        .limit(3);

      if (!weeklyError) finalBonPlans = weeklyBonPlans || finalBonPlans;
    }

    const today = new Date();
    const title = `Ton kiff du ${today.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}`;

    const htmlContent = generateNewsletterHTML(finalBonPlans, today);

    const { data: subscribers, error: subscribersError } = await supabase
      .from("user_profiles")
      .select("email, first_name")
      .eq("subscription_status", "active")
      .not("email", "is", null);

    if (subscribersError) throw subscribersError;

    const emailTasks = subscribers?.map(sub => {
      const personalizedHTML = htmlContent.replace("{{first_name}}", sub.first_name || "ma belle");

      return fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Nowme Club <contact@nowme.fr>",
          to: sub.email,
          subject: title,
          html: personalizedHTML
        })
      });
    }) || [];

    await Promise.all(emailTasks);

    console.log(`✅ Newsletter envoyée à ${subscribers?.length || 0} abonnées.`);

    return new Response(JSON.stringify({
      success: true,
      sent: subscribers?.length || 0,
      featured_posts: finalBonPlans.length
    }), {
      headers: corsHeaders,
      status: 200
    });

  } catch (error) {
    logger.error("❌ Erreur envoi newsletter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: corsHeaders,
        status: 500
      }
    );
  }
});

function generateNewsletterHTML(bonPlans: BonPlan[], date: Date): string {
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ton kiff du ${dateStr}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #BF2778, #E4D44C); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .bon-plan { background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #BF2778; }
    .bon-plan h3 { color: #BF2778; margin-top: 0; }
    .meta { color: #666; font-size: 14px; margin-bottom: 10px; }
    .cta { background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💕 Ton kiff du ${dateStr}</h1>
      <p>Les pépites du jour partagées par tes copines !</p>
    </div>
    
    <div class="content">
      <p>Salut {{first_name}} !</p>
      <p>Voici les bons plans qui font le buzz dans la communauté aujourd'hui :</p>

      ${bonPlans.map((plan, index) => `
        <div class="bon-plan">
          <h3>${index + 1}. ${plan.title}</h3>
          <div class="meta">
            📍 ${plan.location || 'Paris'} • 
            🏷️ ${plan.category} • 
            👤 Partagé par ${plan.user?.first_name || 'une copine'} • 
            💕 ${plan.likes_count} likes
            ${plan.price ? ` • 💰 ${plan.price}€` : ''}
            ${plan.discount ? ` • 🎯 ${plan.discount}` : ''}
          </div>
          <p>${plan.description}</p>
        </div>
      `).join('')}

      ${bonPlans.length === 0 ? `
        <div class="bon-plan">
          <h3>🌟 Pas de nouveaux bons plans aujourd'hui</h3>
          <p>Mais ne t'inquiète pas ! Profite de cette journée pour explorer tes anciens favoris ou partager tes propres découvertes avec la communauté.</p>
        </div>
      ` : ''}

      <div style="background: linear-gradient(135deg, #BF2778, #E4D44C); border-radius: 12px; padding: 20px; color: white; text-align: center; margin: 30px 0;">
        <h3 style="margin-top: 0; color: white;">🎯 Rappel du jour</h3>
        <p>Tu mérites de kiffer ! Prends 5 minutes aujourd'hui pour faire quelque chose qui te fait du bien.</p>
      </div>

      <div style="text-align: center;">
        <a href="https://club.nowme.fr/community-space" class="cta">
          ✨ Partager un bon plan
        </a>
      </div>

      <p>Kiffe bien ta journée !</p>
      <p>L'équipe Nowme 💕</p>
    </div>
    
    <div class="footer">
      <p>Tu reçois cet email car tu es abonnée à Nowme Club.</p>
      <p>
        <a href="https://club.nowme.fr/community-space">Espace communautaire</a> • 
        <a href="https://club.nowme.fr/account">Mon compte</a> • 
        <a href="https://club.nowme.fr/unsubscribe">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
