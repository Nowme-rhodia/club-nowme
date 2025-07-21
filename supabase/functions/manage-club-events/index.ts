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
    const { action, eventData, userId } = await req.json();

    switch (action) {
      case 'create_event':
        return await createEvent(supabase, eventData);
      
      case 'register_user':
        return await registerUserToEvent(supabase, eventData.eventId, userId);
      
      case 'cancel_registration':
        return await cancelRegistration(supabase, eventData.eventId, userId);
      
      case 'get_user_events':
        return await getUserEvents(supabase, userId);
      
      case 'send_event_reminder':
        return await sendEventReminder(supabase, eventData.eventId);
      
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

async function createEvent(supabase: any, eventData: any) {
  const { data, error } = await supabase
    .from('club_events')
    .insert({
      title: eventData.title,
      description: eventData.description,
      event_type: eventData.type,
      date_time: eventData.dateTime,
      location: eventData.location,
      max_participants: eventData.maxParticipants || 20,
      price_discovery: eventData.priceDiscovery || 0,
      price_premium: eventData.pricePremium || 0,
      image_url: eventData.imageUrl,
      organizer_id: eventData.organizerId
    })
    .select()
    .single();

  if (error) throw error;

  // Envoyer notification aux membres
  await notifyMembers(supabase, data.id, 'new_event');

  return new Response(
    JSON.stringify({ success: true, event: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function registerUserToEvent(supabase: any, eventId: string, userId: string) {
  // Vérifier si l'événement n'est pas complet
  const { data: event, error: eventError } = await supabase
    .from('club_events')
    .select('current_participants, max_participants, event_type')
    .eq('id', eventId)
    .single();

  if (eventError) throw eventError;

  if (event.current_participants >= event.max_participants) {
    throw new Error('Événement complet');
  }

  // Vérifier le type d'abonnement pour les événements premium
  if (event.event_type === 'premium') {
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('subscription_type')
      .eq('user_id', userId)
      .single();

    if (userError) throw userError;

    if (user.subscription_type !== 'premium') {
      throw new Error('Événement réservé aux membres premium');
    }
  }

  // Inscrire l'utilisateur
  const { data, error } = await supabase
    .from('event_registrations')
    .insert({
      event_id: eventId,
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;

  // Envoyer email de confirmation
  await sendRegistrationConfirmation(supabase, eventId, userId);

  return new Response(
    JSON.stringify({ success: true, registration: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelRegistration(supabase: any, eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserEvents(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      *,
      event:club_events(*)
    `)
    .eq('user_id', userId)
    .order('registration_date', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ events: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function notifyMembers(supabase: any, eventId: string, type: string) {
  // Récupérer tous les membres actifs
  const { data: members, error } = await supabase
    .from('user_profiles')
    .select('email, subscription_type')
    .eq('subscription_status', 'active');

  if (error) {
    console.error('Erreur récupération membres:', error);
    return;
  }

  // Récupérer les détails de l'événement
  const { data: event, error: eventError } = await supabase
    .from('club_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    console.error('Erreur récupération événement:', error);
    return;
  }

  // Filtrer selon le type d'événement
  const eligibleMembers = event.event_type === 'premium' 
    ? members.filter(m => m.subscription_type === 'premium')
    : members;

  // Envoyer les emails
  for (const member of eligibleMembers) {
    await supabase
      .from('emails')
      .insert({
        to_address: member.email,
        subject: `Nouvel événement : ${event.title}`,
        content: `
          Salut !

          Un nouvel événement vient d'être ajouté au club :

          🎉 ${event.title}
          📅 ${new Date(event.date_time).toLocaleDateString('fr-FR')}
          📍 ${event.location}

          ${event.description}

          Inscris-toi vite, les places sont limitées !

          À bientôt,
          L'équipe Nowme
        `,
        status: 'pending'
      });
  }
}

async function sendRegistrationConfirmation(supabase: any, eventId: string, userId: string) {
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('user_id', userId)
    .single();

  if (userError) return;

  const { data: event, error: eventError } = await supabase
    .from('club_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) return;

  await supabase
    .from('emails')
    .insert({
      to_address: user.email,
      subject: `Inscription confirmée : ${event.title}`,
      content: `
        Salut ${user.first_name} !

        Ton inscription à l'événement "${event.title}" est confirmée ! 🎉

        📅 Date : ${new Date(event.date_time).toLocaleDateString('fr-FR')} à ${new Date(event.date_time).toLocaleTimeString('fr-FR')}
        📍 Lieu : ${event.location}

        On a hâte de te voir !

        L'équipe Nowme
      `,
      status: 'pending'
    });
}

async function sendEventReminder(supabase: any, eventId: string) {
  // Récupérer tous les inscrits
  const { data: registrations, error } = await supabase
    .from('event_registrations')
    .select(`
      user:user_profiles(email, first_name),
      event:club_events(*)
    `)
    .eq('event_id', eventId)
    .eq('status', 'registered');

  if (error) throw error;

  // Envoyer rappel à chaque inscrit
  for (const registration of registrations) {
    await supabase
      .from('emails')
      .insert({
        to_address: registration.user.email,
        subject: `Rappel : ${registration.event.title} c'est demain !`,
        content: `
          Salut ${registration.user.first_name} !

          Petit rappel : l'événement "${registration.event.title}" a lieu demain !

          📅 ${new Date(registration.event.date_time).toLocaleDateString('fr-FR')} à ${new Date(registration.event.date_time).toLocaleTimeString('fr-FR')}
          📍 ${registration.event.location}

          On a hâte de te voir ! 🎉

          L'équipe Nowme
        `,
        status: 'pending'
      });
  }

  return new Response(
    JSON.stringify({ success: true, sent: registrations.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}