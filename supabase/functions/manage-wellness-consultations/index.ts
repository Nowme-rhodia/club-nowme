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
    const { action, consultationData, userId } = await req.json();

    switch (action) {
      case 'book_consultation':
        return await bookConsultation(supabase, consultationData, userId);
      
      case 'get_user_consultations':
        return await getUserConsultations(supabase, userId);
      
      case 'check_quarterly_eligibility':
        return await checkQuarterlyEligibility(supabase, userId);
      
      case 'reschedule_consultation':
        return await rescheduleConsultation(supabase, consultationData);
      
      case 'complete_consultation':
        return await completeConsultation(supabase, consultationData);
      
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

async function bookConsultation(supabase: any, consultationData: any, userId: string) {
  // Vérifier que l'utilisateur est premium
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('subscription_type, subscription_status')
    .eq('user_id', userId)
    .single();

  if (userError) throw userError;

  if (user.subscription_status !== 'active' || user.subscription_type !== 'premium') {
    throw new Error('Consultations réservées aux membres premium');
  }

  // Vérifier l'éligibilité trimestrielle
  const currentQuarter = getCurrentQuarter();
  const { data: existingConsultation, error: checkError } = await supabase
    .from('wellness_consultations')
    .select('id')
    .eq('user_id', userId)
    .eq('quarter_used', currentQuarter)
    .eq('status', 'completed')
    .single();

  if (existingConsultation) {
    throw new Error('Vous avez déjà utilisé votre consultation gratuite ce trimestre');
  }

  // Créer la consultation
  const { data, error } = await supabase
    .from('wellness_consultations')
    .insert({
      user_id: userId,
      consultant_name: consultationData.consultantName,
      consultant_specialty: consultationData.specialty,
      consultation_type: consultationData.type,
      scheduled_date: consultationData.scheduledDate,
      duration_minutes: consultationData.duration || 45,
      quarter_used: currentQuarter
    })
    .select()
    .single();

  if (error) throw error;

  // Envoyer confirmation
  await sendConsultationConfirmation(supabase, data.id, userId);

  return new Response(
    JSON.stringify({ success: true, consultation: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserConsultations(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('wellness_consultations')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ consultations: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkQuarterlyEligibility(supabase: any, userId: string) {
  const currentQuarter = getCurrentQuarter();
  
  const { data: existingConsultation, error } = await supabase
    .from('wellness_consultations')
    .select('id')
    .eq('user_id', userId)
    .eq('quarter_used', currentQuarter)
    .eq('status', 'completed')
    .single();

  const isEligible = !existingConsultation;

  return new Response(
    JSON.stringify({ 
      eligible: isEligible, 
      quarter: currentQuarter,
      message: isEligible 
        ? 'Vous pouvez réserver votre consultation gratuite'
        : 'Consultation déjà utilisée ce trimestre'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function rescheduleConsultation(supabase: any, consultationData: any) {
  const { error } = await supabase
    .from('wellness_consultations')
    .update({
      scheduled_date: consultationData.newDate,
      status: 'rescheduled'
    })
    .eq('id', consultationData.consultationId);

  if (error) throw error;

  // Envoyer notification de reprogrammation
  await sendRescheduleNotification(supabase, consultationData.consultationId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function completeConsultation(supabase: any, consultationData: any) {
  const { error } = await supabase
    .from('wellness_consultations')
    .update({
      status: 'completed',
      notes: consultationData.notes,
      follow_up_date: consultationData.followUpDate
    })
    .eq('id', consultationData.consultationId);

  if (error) throw error;

  // Ajouter des points de fidélité
  await supabase.rpc('add_reward_points', {
    user_id: consultationData.userId,
    points: 100,
    reason: 'Consultation bien-être complétée'
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter}-${year}`;
}

async function sendConsultationConfirmation(supabase: any, consultationId: string, userId: string) {
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('user_id', userId)
    .single();

  if (userError) return;

  const { data: consultation, error: consultationError } = await supabase
    .from('wellness_consultations')
    .select('*')
    .eq('id', consultationId)
    .single();

  if (consultationError) return;

  await supabase
    .from('emails')
    .insert({
      to_address: user.email,
      subject: 'Consultation bien-être confirmée',
      content: `
        Salut ${user.first_name} !

        Ta consultation bien-être est confirmée ! 🌟

        📅 Date : ${new Date(consultation.scheduled_date).toLocaleDateString('fr-FR')} à ${new Date(consultation.scheduled_date).toLocaleTimeString('fr-FR')}
        👩‍⚕️ Consultante : ${consultation.consultant_name}
        🎯 Spécialité : ${consultation.consultant_specialty}
        📞 Type : ${consultation.consultation_type === 'phone' ? 'Téléphone' : consultation.consultation_type === 'video' ? 'Visio' : 'En personne'}
        ⏱️ Durée : ${consultation.duration_minutes} minutes

        Tu recevras les détails de connexion 24h avant le rendez-vous.

        Prends soin de toi ! 💕
        L'équipe Nowme
      `,
      status: 'pending'
    });
}

async function sendRescheduleNotification(supabase: any, consultationId: string) {
  const { data: consultation, error: consultationError } = await supabase
    .from('wellness_consultations')
    .select(`
      *,
      user:user_profiles(email, first_name)
    `)
    .eq('id', consultationId)
    .single();

  if (consultationError) return;

  await supabase
    .from('emails')
    .insert({
      to_address: consultation.user.email,
      subject: 'Consultation reprogrammée',
      content: `
        Salut ${consultation.user.first_name} !

        Ta consultation bien-être a été reprogrammée :

        📅 Nouvelle date : ${new Date(consultation.scheduled_date).toLocaleDateString('fr-FR')} à ${new Date(consultation.scheduled_date).toLocaleTimeString('fr-FR')}
        👩‍⚕️ Consultante : ${consultation.consultant_name}

        Tu recevras une confirmation 24h avant le nouveau rendez-vous.

        À bientôt ! 💕
        L'équipe Nowme
      `,
      status: 'pending'
    });
}