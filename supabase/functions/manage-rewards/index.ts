import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Configuration des niveaux de fidélité
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  platinum: 3000
};

const TIER_BENEFITS = {
  bronze: {
    discount: 0,
    description: "Bienvenue dans le club !"
  },
  silver: {
    discount: 5,
    description: "5% de réduction supplémentaire"
  },
  gold: {
    discount: 10,
    description: "10% de réduction supplémentaire + accès prioritaire"
  },
  platinum: {
    discount: 15,
    description: "15% de réduction supplémentaire + avantages VIP"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { action, rewardData, userId } = await req.json();

    switch (action) {
      case 'add_points':
        return await addPoints(supabase, userId, rewardData.points, rewardData.reason);
      
      case 'spend_points':
        return await spendPoints(supabase, userId, rewardData.points, rewardData.reason);
      
      case 'get_user_rewards':
        return await getUserRewards(supabase, userId);
      
      case 'check_tier_upgrade':
        return await checkTierUpgrade(supabase, userId);
      
      case 'get_available_rewards':
        return await getAvailableRewards(supabase);
      
      case 'redeem_reward':
        return await redeemReward(supabase, userId, rewardData.rewardId);
      
      default:
        throw new Error('Action non reconnue');
    }

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function addPoints(supabase: any, userId: string, points: number, reason: string) {
  // Récupérer les récompenses actuelles
  const { data: currentRewards, error: rewardsError } = await supabase
    .from('member_rewards')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (rewardsError) throw rewardsError;

  const newPointsEarned = currentRewards.points_earned + points;
  const newPointsBalance = currentRewards.points_balance + points;

  // Calculer le nouveau niveau
  const newTier = calculateTier(newPointsEarned);
  const tierChanged = newTier !== currentRewards.tier_level;

  // Mettre à jour les points
  const { error: updateError } = await supabase
    .from('member_rewards')
    .update({
      points_earned: newPointsEarned,
      points_balance: newPointsBalance,
      tier_level: newTier,
      last_activity_date: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) throw updateError;

  // Si changement de niveau, envoyer notification
  if (tierChanged) {
    await sendTierUpgradeNotification(supabase, userId, newTier);
  }

  // Logger l'activité
  await logRewardActivity(supabase, userId, 'earned', points, reason);

  return new Response(
    JSON.stringify({ 
      success: true, 
      newBalance: newPointsBalance,
      newTier: newTier,
      tierChanged: tierChanged
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function spendPoints(supabase: any, userId: string, points: number, reason: string) {
  // Vérifier le solde
  const { data: currentRewards, error: rewardsError } = await supabase
    .from('member_rewards')
    .select('points_balance')
    .eq('user_id', userId)
    .single();

  if (rewardsError) throw rewardsError;

  if (currentRewards.points_balance < points) {
    throw new Error('Solde de points insuffisant');
  }

  // Déduire les points
  const { error: updateError } = await supabase
    .from('member_rewards')
    .update({
      points_spent: currentRewards.points_spent + points,
      points_balance: currentRewards.points_balance - points,
      last_activity_date: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) throw updateError;

  // Logger l'activité
  await logRewardActivity(supabase, userId, 'spent', points, reason);

  return new Response(
    JSON.stringify({ 
      success: true, 
      newBalance: currentRewards.points_balance - points
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserRewards(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('member_rewards')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  // Ajouter les informations du niveau
  const tierInfo = TIER_BENEFITS[data.tier_level];
  const nextTier = getNextTier(data.tier_level);
  const pointsToNextTier = nextTier ? TIER_THRESHOLDS[nextTier] - data.points_earned : 0;

  return new Response(
    JSON.stringify({ 
      rewards: {
        ...data,
        tier_benefits: tierInfo,
        next_tier: nextTier,
        points_to_next_tier: pointsToNextTier
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkTierUpgrade(supabase: any, userId: string) {
  const { data: rewards, error } = await supabase
    .from('member_rewards')
    .select('points_earned, tier_level')
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  const currentTier = calculateTier(rewards.points_earned);
  
  if (currentTier !== rewards.tier_level) {
    // Mettre à jour le niveau
    await supabase
      .from('member_rewards')
      .update({ tier_level: currentTier })
      .eq('user_id', userId);

    // Envoyer notification
    await sendTierUpgradeNotification(supabase, userId, currentTier);

    return new Response(
      JSON.stringify({ 
        upgraded: true, 
        newTier: currentTier,
        benefits: TIER_BENEFITS[currentTier]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ upgraded: false }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAvailableRewards(supabase: any) {
  // Définir les récompenses disponibles
  const rewards = [
    {
      id: 'discount_10',
      name: 'Réduction 10€',
      description: 'Réduction de 10€ sur votre prochaine réservation',
      points_cost: 200,
      type: 'discount',
      value: 10
    },
    {
      id: 'discount_25',
      name: 'Réduction 25€',
      description: 'Réduction de 25€ sur votre prochaine réservation',
      points_cost: 500,
      type: 'discount',
      value: 25
    },
    {
      id: 'free_consultation',
      name: 'Consultation supplémentaire',
      description: 'Une consultation bien-être supplémentaire gratuite',
      points_cost: 800,
      type: 'service',
      value: 'consultation'
    },
    {
      id: 'vip_event',
      name: 'Accès événement VIP',
      description: 'Invitation à un événement exclusif',
      points_cost: 1000,
      type: 'access',
      value: 'vip_event'
    }
  ];

  return new Response(
    JSON.stringify({ rewards }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function redeemReward(supabase: any, userId: string, rewardId: string) {
  // Récupérer les détails de la récompense
  const rewardDetails = await getRewardDetails(rewardId);
  if (!rewardDetails) {
    throw new Error('Récompense non trouvée');
  }

  // Vérifier et dépenser les points
  await spendPoints(supabase, userId, rewardDetails.points_cost, `Échange: ${rewardDetails.name}`);

  // Créer le bon de réduction ou l'avantage
  await createRewardBenefit(supabase, userId, rewardDetails);

  // Envoyer notification
  await sendRewardRedemptionNotification(supabase, userId, rewardDetails);

  return new Response(
    JSON.stringify({ 
      success: true, 
      reward: rewardDetails,
      message: 'Récompense échangée avec succès !'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function calculateTier(pointsEarned: number): string {
  if (pointsEarned >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (pointsEarned >= TIER_THRESHOLDS.gold) return 'gold';
  if (pointsEarned >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

function getNextTier(currentTier: string): string | null {
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tiers.indexOf(currentTier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

async function logRewardActivity(supabase: any, userId: string, type: string, points: number, reason: string) {
  // Vous pouvez créer une table d'historique si nécessaire
  console.log(`Reward activity: ${type} ${points} points for user ${userId} - ${reason}`);
}

async function sendTierUpgradeNotification(supabase: any, userId: string, newTier: string) {
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('user_id', userId)
    .single();

  if (error) return;

  const tierInfo = TIER_BENEFITS[newTier];

  await supabase
    .from('emails')
    .insert({
      to_address: user.email,
      subject: `Félicitations ! Tu es maintenant ${newTier.toUpperCase()} ! 🏆`,
      content: `
        Salut ${user.first_name} !

        Incroyable ! Tu viens de passer au niveau ${newTier.toUpperCase()} ! 🎉

        Tes nouveaux avantages :
        ${tierInfo.description}

        Continue comme ça, tu es au top ! 💪

        L'équipe Nowme 💕
      `,
      status: 'pending'
    });
}

async function getRewardDetails(rewardId: string) {
  const rewards = {
    'discount_10': {
      id: 'discount_10',
      name: 'Réduction 10€',
      description: 'Réduction de 10€ sur votre prochaine réservation',
      points_cost: 200,
      type: 'discount',
      value: 10
    },
    'discount_25': {
      id: 'discount_25',
      name: 'Réduction 25€',
      description: 'Réduction de 25€ sur votre prochaine réservation',
      points_cost: 500,
      type: 'discount',
      value: 25
    },
    'free_consultation': {
      id: 'free_consultation',
      name: 'Consultation supplémentaire',
      description: 'Une consultation bien-être supplémentaire gratuite',
      points_cost: 800,
      type: 'service',
      value: 'consultation'
    },
    'vip_event': {
      id: 'vip_event',
      name: 'Accès événement VIP',
      description: 'Invitation à un événement exclusif',
      points_cost: 1000,
      type: 'access',
      value: 'vip_event'
    }
  };

  return rewards[rewardId] || null;
}

async function createRewardBenefit(supabase: any, userId: string, rewardDetails: any) {
  // Créer l'avantage selon le type
  if (rewardDetails.type === 'discount') {
    // Créer un code de réduction
    const discountCode = `REWARD${Date.now()}`;
    
    // Vous pouvez créer une table pour les codes de réduction
    // ou intégrer avec votre système de paiement
  }
  
  // Logger l'échange
  console.log(`Reward redeemed: ${rewardDetails.name} for user ${userId}`);
}

async function sendRewardRedemptionNotification(supabase: any, userId: string, rewardDetails: any) {
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('user_id', userId)
    .single();

  if (error) return;

  await supabase
    .from('emails')
    .insert({
      to_address: user.email,
      subject: `Ta récompense ${rewardDetails.name} est prête ! 🎁`,
      content: `
        Salut ${user.first_name} !

        Tu viens d'échanger tes points contre : ${rewardDetails.name} ! 🎉

        ${rewardDetails.description}

        ${rewardDetails.type === 'discount' ? 'Ton code de réduction sera disponible dans ton compte.' : ''}
        ${rewardDetails.type === 'service' ? 'Tu peux maintenant réserver ta consultation supplémentaire.' : ''}
        ${rewardDetails.type === 'access' ? 'Tu recevras une invitation spéciale pour le prochain événement VIP.' : ''}

        Profite bien ! 💕

        L'équipe Nowme
      `,
      status: 'pending'
    });
}