import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { email, authUserId } = await req.json();

    if (!email || !authUserId) {
      throw new Error('Email et authUserId requis');
    }

    console.log(`🔗 Liaison du profil ${email} avec l'utilisateur auth ${authUserId}`);

    // Vérifier que l'utilisateur auth existe
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
    if (authError || !authUser.user) {
      throw new Error(`Utilisateur auth non trouvé: ${authUserId}`);
    }

    // 🔹 Créer ou mettre à jour le profil (UPSERT)
    const { data: upsertedProfile, error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          email,
          user_id: authUserId,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (upsertError) {
      throw new Error(`Erreur UPSERT profil: ${upsertError.message}`);
    }

    console.log(`✅ Profil ${upsertedProfile.id} lié à l'utilisateur auth ${authUserId}`);

    // 🔹 Vérifier si une ligne rewards existe déjà
    const { data: existingReward } = await supabase
      .from('member_rewards')
      .select('id')
      .eq('user_id', upsertedProfile.id)
      .maybeSingle();

    if (!existingReward) {
      // créer nouvelle ligne reward
      const { error: insertRewardError } = await supabase
        .from('member_rewards')
        .insert({
          user_id: upsertedProfile.id,
          points_earned: 0,
          points_spent: 0,
          points_balance: 0,
          tier_level: 'platinum',
          created_at: new Date().toISOString(),
        });

      if (insertRewardError) {
        console.warn(`⚠️ Erreur création rewards: ${insertRewardError.message}`);
      } else {
        console.log(`✅ Reward créé pour ${email}`);
      }
    } else {
      console.log(`ℹ️ Reward déjà existant pour ${email}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Profil lié avec succès`,
        profileId: upsertedProfile.id,
        authUserId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erreur liaison profil:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
