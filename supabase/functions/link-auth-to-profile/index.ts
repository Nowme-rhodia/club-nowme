import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { email, authUserId } = await req.json();
    if (!email || !authUserId) {
      throw new Error('Email et authUserId requis');
    }

    console.info('🚀 link-auth-to-profile v2025-09-23-REWARDS');

    const now = new Date().toISOString();

    // 🔹 Vérifier si le profil existe déjà
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (checkError) {
      console.warn(`⚠️ Erreur lors de la vérification du profil: ${checkError.message}`);
    }

    // 🔹 UPSERT basé sur user_id
    const { data: profile, error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          email,
          user_id: authUserId,
          updated_at: now,
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      )
      .select('id, user_id')
      .single();

    if (upsertError) throw upsertError;

    const wasCreated = !existingProfile;
    console.log(
      wasCreated
        ? `🎉 Nouveau profil créé: ${profile.id} pour ${email}`
        : `♻️ Profil mis à jour: ${profile.id} pour ${email}`
    );

    // 🔹 Vérifier si reward existe déjà
    let rewardData = null;

    const { data: reward } = await supabase
      .from('member_rewards')
      .select('id, tier_level, points_balance')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!reward) {
      const { data: newReward, error: rewardErr } = await supabase
        .from('member_rewards')
        .insert({
          user_id: profile.id,
          points_earned: 0,
          points_spent: 0,
          points_balance: 0,
          tier_level: 'platinum',
        })
        .select('id, tier_level, points_balance')
        .single();

      if (rewardErr) {
        console.warn(`⚠️ Erreur création rewards: ${rewardErr.message}`);
      } else {
        rewardData = newReward;
        console.log(`✅ Reward créé pour ${email}`);
      }
    } else {
      rewardData = reward;
      console.log(`ℹ️ Reward déjà existant pour ${email}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: wasCreated ? 'Profil créé avec succès' : 'Profil mis à jour avec succès',
        profileId: profile.id,
        authUserId: profile.user_id,
        rewards: rewardData || null,
      }),
      {
        status: wasCreated ? 201 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erreur liaison profil:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error?.message || error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
