import { serve } from "std/http/server.ts"
import { createSupabaseClient, corsHeaders } from "../_shared/utils/index.ts"

interface MarketingTarget {
  target_user_id: string;
  target_email: string;
  target_first_name: string;
  campaign_type: string;
  metadata: {
    event_title?: string;
    amount?: number;
    member_price?: number;
  };
}

const TEMPLATES: Record<string, { subject: string, body: (data: MarketingTarget) => string }> = {
  // --- HESITANTES ---
  'hesitante_j1': {
    subject: "Et si on t'enlevait une épine du pied ? 🌸",
    body: (data) => `
      <p>Hello ${data.target_first_name || 'future membre'},</p>
      <p>On sait ce que c'est... La charge mentale, le temps qui file, l'envie de bien faire mais l'énergie qui manque parfois pour chercher les bons plans ou les bonnes personnes.</p>
      <p>C'est exactement pour ça qu'on a créé le Club. Pour que tu n'aies plus à gérer tout ça toute seule.</p>
      <p>Tu as juste à te laisser porter. Viens voir à quel point la vie est plus douce de l'autre côté.</p>
      <p>Rejoins-nous pour seulement <strong>12,99€ le premier mois</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://club.nowme.fr/subscription" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">Je me laisse porter</a>
      </div>
    `
  },
  'hesitante_j3': {
    subject: "Arrête de chercher sur Google...",
    body: (data) => `
      <p>Arrête de payer ton cocktail plein pot.</p>
      <p>Arrête de chercher une bonne thérapeute au hasard sur internet.</p>
      <p>Arrête de perdre du temps à trouver des services à domicile fiables.</p>
      <p>On les a ici. On les a testés pour toi. Ils sont validés par la commu.</p>
      <p>En ne validant pas ton abonnement, tu te prives de ce carnet d'adresses secret et de toutes ces économies (Cocktails, Soins, Services...).</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://club.nowme.fr/subscription" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">J'accède au carnet d'adresses</a>
      </div>
    `
  },
  'hesitante_j7': {
    subject: "Elles ont sauté le pas (et elles ne regrettent pas)",
    body: (data) => `
      <p>Rejoindre un club, c'est parfois intimidant. Mais regarde autour de toi : des femmes comme toi, qui voulaient juste kiffer, rencontrer et souffler.</p>
      <p>Elles sont là, elles t'attendent. Ne reste pas sur le pas de la porte. Investis en toi. Investis en ton bien-être.</p>
      <p>Le Club Nowme n'attend qu'une chose, que tu sautes le pas.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://club.nowme.fr/subscription" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">Je rejoins le Club</a>
      </div>
    `
  },

  // --- EXPLORATRICES ---
  'exploratrice_j1_achat': {
    subject: "Tu vas adorer cet événement ! 🎉",
    body: (data) => `
      <p>Bravo ! Tu as ta place pour <strong>${data.metadata.event_title}</strong>. On a tellement hâte de t'y voir.</p>
      <p>Petite info entre nous : savais-tu que nos membres ont accès à ce même événement pour <strong>${data.metadata.member_price || 'un prix réduit'}€</strong> ?</p>
      <p>C'est pas grave pour cette fois, l'important c'est que tu sois là. Mais sache que le Club réserve plein de petites attentions comme ça à ses membres.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://club.nowme.fr/subscription" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">Découvrir les avantages membres</a>
      </div>
    `
  },
  'exploratrice_j_minus_2_event': {
    subject: "J-2 ! Prête pour le kiff ?",
    body: (data) => `
      <p>Plus que deux jours avant <strong>${data.metadata.event_title}</strong>.</p>
      <p>Prépare ta tenue, ton sourire (et ta voix si c'est du karaoké !).</p>
      <p>Toute l'équipe et les membres du Club ont hâte de t'accueillir. À très vite !</p>
    `
  },
  'exploratrice_j1_post_event': {
    subject: "On a adoré ce moment avec toi !",
    body: (data) => `
      <p>Hello !</p>
      <p>On a adoré partager ce moment avec toi chez <strong>Nowme</strong> ! J'espère que ça t'a fait autant de bien qu'à nous.</p>
      <p>Pour la prochaine fois, on aimerait te gâter encore plus.</p>
      <p>En tant que membre, cette place t'aurait coûté <strong>${data.metadata.member_price || '?'}€</strong> au lieu de <strong>${data.metadata.amount || '?'}€</strong>.</p>
      <p>Mais au-delà de l'économie, c'est tout un accès qu'on veut t'offrir :</p>
      <ul>
        <li>Nos meilleures thérapeutes recommandées</li>
        <li>Nos adresses secrètes (cocktails, restos...)</li>
        <li>Nos services testés pour toi</li>
      </ul>
      <p>L'abonnement est à <strong>12,99€/mois</strong>. Viens nous rejoindre, on t'attend de l'autre côté !</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://club.nowme.fr/subscription" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 99px; font-weight: bold; display: inline-block;">Je rejoins la communauté</a>
      </div>
    `
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient();

    // 1. Get targets via RPC
    const { data: targets, error: rpcError } = await supabase.rpc('get_marketing_targets');

    if (rpcError) {
      throw rpcError;
    }

    if (!targets || targets.length === 0) {
      return new Response(JSON.stringify({ message: 'No targets found today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const results = [];

    // 2. Process each target
    for (const target of targets as MarketingTarget[]) {
      const template = TEMPLATES[target.campaign_type];

      if (!template) {
        console.error(`No template found for campaign type: ${target.campaign_type}`);
        continue;
      }

      // 3. Queue email in 'emails' table (to be picked up by 'send-emails' function)
      const { error: insertEmailError } = await supabase
        .from('emails')
        .insert({
          to_address: target.target_email,
          subject: template.subject,
          content: template.body(target),
          status: 'pending' // Default status for queue
        });

      if (insertEmailError) {
        console.error(`Failed to queue email for ${target.target_email}:`, insertEmailError);
        results.push({ email: target.target_email, status: 'failed', error: insertEmailError });
        continue;
      }

      // 4. Log in 'marketing_campaign_logs' to prevent duplicates
      const { error: logError } = await supabase
        .from('marketing_campaign_logs')
        .insert({
          user_id: target.target_user_id, // Can be null
          email: target.target_email,
          campaign_type: target.campaign_type,
          metadata: target.metadata
        });

      if (logError) {
        console.error(`Failed to log campaign for ${target.target_email}:`, logError);
      }

      results.push({ email: target.target_email, campaign: target.campaign_type, status: 'queued' });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
