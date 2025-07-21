import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const { action, masterclassData, userId } = await req.json();

    switch (action) {
      case 'create_masterclass':
        return await createMasterclass(supabase, masterclassData);
      
      case 'register_user':
        return await registerToMasterclass(supabase, masterclassData.masterclassId, userId);
      
      case 'get_user_masterclasses':
        return await getUserMasterclasses(supabase, userId);
      
      case 'send_masterclass_reminder':
        return await sendMasterclassReminder(supabase, masterclassData.masterclassId);
      
      case 'record_attendance':
        return await recordAttendance(supabase, masterclassData.masterclassId, userId);
      
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

async function createMasterclass(supabase: any, masterclassData: any) {
  const { data, error } = await supabase
    .from('masterclasses')
    .insert({
      title: masterclassData.title,
      description: masterclassData.description,
      expert_name: masterclassData.expertName,
      expert_bio: masterclassData.expertBio,
      expert_photo_url: masterclassData.expertPhotoUrl,
      date_time: masterclassData.dateTime,
      duration_minutes: masterclassData.duration || 90,
      max_participants: masterclassData.maxParticipants || 50,
      meeting_link: masterclassData.meetingLink,
      category: masterclassData.category,
      materials: masterclassData.materials || {}
    })
    .select()
    .single();

  if (error) throw error;

  // Notifier tous les membres premium
  await notifyPremiumMembers(supabase, data.id, 'new_masterclass');

  return new Response(
    JSON.stringify({ success: true, masterclass: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function registerToMasterclass(supabase: any, masterclassId: string, userId: string) {
  // Vérifier que l'utilisateur est premium
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('subscription_type, subscription_status')
    .eq('user_id', userId)
    .single();

  if (userError) throw userError;

  if (user.subscription_status !== 'active' || user.subscription_type !== 'premium') {
    throw new Error('Masterclass réservée aux membres premium');
  }

  // Vérifier les places disponibles
  const { data: masterclass, error: masterclassError } = await supabase
    .from('masterclasses')
    .select('current_participants, max_participants')
    .eq('id', masterclassId)
    .single();

  if (masterclassError) throw masterclassError;

  if (masterclass.current_participants >= masterclass.max_participants) {
    throw new Error('Masterclass complète');
  }

  // Inscrire l'utilisateur
  const { data, error } = await supabase
    .from('masterclass_attendees')
    .insert({
      masterclass_id: masterclassId,
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;

  // Envoyer confirmation
  await sendMasterclassConfirmation(supabase, masterclassId, userId);

  return new Response(
    JSON.stringify({ success: true, registration: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserMasterclasses(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('masterclass_attendees')
    .select(`
      *,
      masterclass:masterclasses(*)
    `)
    .eq('user_id', userId)
    .order('registration_date', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ masterclasses: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function notifyPremiumMembers(supabase: any, masterclassId: string, type: string) {
  // Récupérer tous les membres premium
  const { data: members, error } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('subscription_status', 'active')
    .eq('subscription_type', 'premium');

  if (error) return;

  // Récupérer les détails de la masterclass
  const { data: masterclass, error: masterclassError } = await supabase
    .from('masterclasses')
    .select('*')
    .eq('id', masterclassId)
    .single();

  if (masterclassError) return;

  // Envoyer les emails
  for (const member of members) {
    await supabase
      .from('emails')
      .insert({
        to_address: member.email,
        subject: `Nouvelle masterclass : ${masterclass.title}`,
        content: `
          Salut ${member.first_name} !

          Une nouvelle masterclass exclusive vient d'être programmée :

          🎓 ${masterclass.title}
          👩‍🏫 Avec ${masterclass.expert_name}
          📅 ${new Date(masterclass.date_time).toLocaleDateString('fr-FR')} à ${new Date(masterclass.date_time).toLocaleTimeString('fr-FR')}
          ⏱️ Durée : ${masterclass.duration_minutes} minutes

          ${masterclass.description}

          Inscris-toi vite, les places sont limitées !

          À bientôt,
          L'équipe Nowme
        `,
        status: 'pending'
      });
  }
}

async function sendMasterclassConfirmation(supabase: any, masterclassId: string, userId: string) {
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('user_id', userId)
    .single();

  if (userError) return;

  const { data: masterclass, error: masterclassError } = await supabase
    .from('masterclasses')
    .select('*')
    .eq('id', masterclassId)
    .single();

  if (masterclassError) return;

  await supabase
    .from('emails')
    .insert({
      to_address: user.email,
      subject: `Inscription confirmée : ${masterclass.title}`,
      content: `
        Salut ${user.first_name} !

        Ton inscription à la masterclass "${masterclass.title}" est confirmée ! 🎓

        📅 Date : ${new Date(masterclass.date_time).toLocaleDateString('fr-FR')} à ${new Date(masterclass.date_time).toLocaleTimeString('fr-FR')}
        👩‍🏫 Experte : ${masterclass.expert_name}
        ⏱️ Durée : ${masterclass.duration_minutes} minutes

        Le lien de connexion te sera envoyé 24h avant la session.

        À très bientôt !
        L'équipe Nowme
      `,
      status: 'pending'
    });
}

async function sendMasterclassReminder(supabase: any, masterclassId: string) {
  // Récupérer tous les inscrits
  const { data: attendees, error } = await supabase
    .from('masterclass_attendees')
    .select(`
      user:user_profiles(email, first_name),
      masterclass:masterclasses(*)
    `)
    .eq('masterclass_id', masterclassId)
    .eq('attendance_status', 'registered');

  if (error) throw error;

  // Envoyer rappel avec lien de connexion
  for (const attendee of attendees) {
    await supabase
      .from('emails')
      .insert({
        to_address: attendee.user.email,
        subject: `Masterclass demain : ${attendee.masterclass.title}`,
        content: `
          Salut ${attendee.user.first_name} !

          Ta masterclass "${attendee.masterclass.title}" a lieu demain !

          📅 ${new Date(attendee.masterclass.date_time).toLocaleDateString('fr-FR')} à ${new Date(attendee.masterclass.date_time).toLocaleTimeString('fr-FR')}
          👩‍🏫 Avec ${attendee.masterclass.expert_name}

          🔗 Lien de connexion : ${attendee.masterclass.meeting_link}

          Prépare tes questions, ça va être génial ! 🎉

          L'équipe Nowme
        `,
        status: 'pending'
      });
  }

  return new Response(
    JSON.stringify({ success: true, sent: attendees.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function recordAttendance(supabase: any, masterclassId: string, userId: string) {
  const { error } = await supabase
    .from('masterclass_attendees')
    .update({ attendance_status: 'attended' })
    .eq('masterclass_id', masterclassId)
    .eq('user_id', userId);

  if (error) throw error;

  // Ajouter des points de fidélité
  await supabase.rpc('add_reward_points', {
    user_id: userId,
    points: 50,
    reason: 'Participation masterclass'
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}