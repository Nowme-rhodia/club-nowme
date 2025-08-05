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

    // Mettre à jour le profil avec le vrai user_id
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        user_id: authUserId,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select('id')
      .single();

    if (updateError) {
      throw new Error(`Erreur mise à jour profil: ${updateError.message}`);
    }

    console.log(`✅ Profil ${updatedProfile.id} lié à l'utilisateur auth ${authUserId}`);

    // Mettre à jour member_rewards avec le nouveau user_id
    const { error: rewardsError } = await supabase
      .from('member_rewards')
      .update({ user_id: updatedProfile.id })
      .eq('user_id', updatedProfile.id); // Utiliser l'ID du profil

    if (rewardsError) {
      console.warn(`⚠️ Erreur mise à jour rewards: ${rewardsError.message}`);
    } else {
      console.log(`✅ Member rewards mis à jour`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Profil lié avec succès`,
      profileId: updatedProfile.id,
      authUserId: authUserId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erreur liaison profil:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});