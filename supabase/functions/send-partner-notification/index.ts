
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://club.nowme.fr',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  partnerId: string;
  type: 'new_booking' | 'booking_cancelled' | 'review_received' | 'profile_approved';
  data: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { partnerId, type, data }: NotificationPayload = await req.json();

    if (!partnerId || !type) {
      throw new Error('Missing required fields: partnerId and type');
    }

    // Récupérer les informations du partenaire
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (partnerError) throw partnerError;

    // Construire le contenu de la notification
    let title = '';
    let content = '';
    let priority = 'normal';

    switch (type) {
      case 'new_booking':
        title = 'Nouvelle réservation';
        content = `Une nouvelle réservation a été effectuée pour "${data.offerTitle}" le ${new Date(data.date).toLocaleDateString('fr-FR')}`;
        priority = 'high';
        break;

      case 'booking_cancelled':
        title = 'Réservation annulée';
        content = `La réservation pour "${data.offerTitle}" du ${new Date(data.date).toLocaleDateString('fr-FR')} a été annulée`;
        priority = 'medium';
        break;

      case 'review_received':
        title = 'Nouvel avis client';
        content = `Un nouvel avis ${data.rating}/5 a été laissé pour "${data.offerTitle}"`;
        priority = 'normal';
        break;

      case 'profile_approved':
        title = 'Profil approuvé';
        content = 'Votre profil partenaire a été approuvé. Vous pouvez maintenant publier vos offres.';
        priority = 'high';
        break;
    }

    // Enregistrer la notification
    const { error: notifError } = await supabase
      .from('partner_notifications')
      .insert({
        partner_id: partnerId,
        type,
        title,
        content,
        priority,
        data,
        read_status: false
      });

    if (notifError) throw notifError;

    // Envoyer un email si la notification est prioritaire
    if (priority === 'high') {
      const { error: emailError } = await supabase
        .from('emails')
        .insert({
          to_address: partner.email,
          subject: title,
          content: `
            Bonjour ${partner.contact_name},

            ${content}

            ${data.meeting_location ? `📍 Lieu : ${data.meeting_location}` : ''}
            ${data.scheduled_at ? `📅 Date : ${new Date(data.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}

            Connectez-vous à votre espace partenaire pour plus de détails et gérer cette réservation.

            L'équipe Nowme
          `,
          status: 'pending'
        });

      if (emailError) throw emailError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});