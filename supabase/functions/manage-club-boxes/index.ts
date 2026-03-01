import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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
    const { action, boxData, userId } = await req.json();

    switch (action) {
      case 'create_quarterly_box':
        return await createQuarterlyBox(supabase, boxData);
      
      case 'ship_boxes_to_premium_members':
        return await shipBoxesToPremiumMembers(supabase, boxData.boxId);
      
      case 'update_shipping_status':
        return await updateShippingStatus(supabase, boxData);
      
      case 'get_user_boxes':
        return await getUserBoxes(supabase, userId);
      
      case 'track_shipment':
        return await trackShipment(supabase, boxData.shipmentId);
      
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

async function createQuarterlyBox(supabase: any, boxData: any) {
  const { data, error } = await supabase
    .from('club_boxes')
    .insert({
      name: boxData.name,
      description: boxData.description,
      quarter: boxData.quarter,
      year: boxData.year,
      estimated_value: boxData.estimatedValue,
      contents: boxData.contents,
      image_url: boxData.imageUrl,
      shipping_start_date: boxData.shippingStartDate,
      shipping_end_date: boxData.shippingEndDate
    })
    .select()
    .single();

  if (error) throw error;

  // Notifier tous les membres premium
  await notifyPremiumMembersNewBox(supabase, data.id);

  return new Response(
    JSON.stringify({ success: true, box: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function shipBoxesToPremiumMembers(supabase: any, boxId: string) {
  // Récupérer tous les membres premium actifs
  const { data: premiumMembers, error: membersError } = await supabase
    .from('user_profiles')
    .select('user_id, email, first_name, last_name, phone')
    .eq('subscription_status', 'active')
    .eq('subscription_type', 'premium');

  if (membersError) throw membersError;

  const shipments = [];

  // Créer une expédition pour chaque membre premium
  for (const member of premiumMembers) {
    // Construire l'adresse de livraison (à adapter selon vos données)
    const shippingAddress = {
      name: `${member.first_name} ${member.last_name}`,
      email: member.email,
      phone: member.phone,
      // Vous devrez récupérer l'adresse depuis le profil utilisateur
      address: "À compléter depuis le profil utilisateur"
    };

    const { data: shipment, error: shipmentError } = await supabase
      .from('box_shipments')
      .insert({
        box_id: boxId,
        user_id: member.user_id,
        shipping_address: shippingAddress,
        status: 'pending'
      })
      .select()
      .single();

    if (!shipmentError) {
      shipments.push(shipment);
      
      // Envoyer notification d'expédition
      await sendShippingNotification(supabase, shipment.id);
    }
  }

  // Mettre à jour le statut de la box
  await supabase
    .from('club_boxes')
    .update({ status: 'shipping' })
    .eq('id', boxId);

  return new Response(
    JSON.stringify({ 
      success: true, 
      shipmentsCreated: shipments.length,
      totalMembers: premiumMembers.length 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateShippingStatus(supabase: any, boxData: any) {
  const { error } = await supabase
    .from('box_shipments')
    .update({
      status: boxData.status,
      tracking_number: boxData.trackingNumber,
      shipping_date: boxData.shippingDate,
      delivery_date: boxData.deliveryDate
    })
    .eq('id', boxData.shipmentId);

  if (error) throw error;

  // Envoyer notification selon le statut
  if (boxData.status === 'shipped') {
    await sendTrackingNotification(supabase, boxData.shipmentId);
  } else if (boxData.status === 'delivered') {
    await sendDeliveryConfirmation(supabase, boxData.shipmentId);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserBoxes(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('box_shipments')
    .select(`
      *,
      box:club_boxes(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ boxes: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function trackShipment(supabase: any, shipmentId: string) {
  const { data, error } = await supabase
    .from('box_shipments')
    .select(`
      *,
      box:club_boxes(*),
      user:user_profiles(email, first_name)
    `)
    .eq('id', shipmentId)
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ shipment: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function notifyPremiumMembersNewBox(supabase: any, boxId: string) {
  // Récupérer les détails de la box
  const { data: box, error: boxError } = await supabase
    .from('club_boxes')
    .select('*')
    .eq('id', boxId)
    .single();

  if (boxError) return;

  // Récupérer tous les membres premium
  const { data: members, error: membersError } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('subscription_status', 'active')
    .eq('subscription_type', 'premium');

  if (membersError) return;

  // Envoyer les notifications
  for (const member of members) {
    await supabase
      .from('emails')
      .insert({
        to_address: member.email,
        subject: `Ta box ${box.quarter} arrive bientôt ! 📦`,
        content: `
          Salut ${member.first_name} !

          Ta box Nowme ${box.quarter} est en préparation ! 🎉

          📦 ${box.name}
          💎 Valeur estimée : ${box.estimated_value}€
          📅 Expédition prévue : ${new Date(box.shipping_start_date).toLocaleDateString('fr-FR')}

          ${box.description}

          Contenu de cette box :
          ${Array.isArray(box.contents) ? box.contents.map(item => `• ${item.name}`).join('\n') : '• Surprise ! 🎁'}

          On a hâte que tu la reçoives !

          L'équipe Nowme 💕
        `,
        status: 'pending'
      });
  }
}

async function sendShippingNotification(supabase: any, shipmentId: string) {
  const { data: shipment, error } = await supabase
    .from('box_shipments')
    .select(`
      *,
      box:club_boxes(*),
      user:user_profiles(email, first_name)
    `)
    .eq('id', shipmentId)
    .single();

  if (error) return;

  await supabase
    .from('emails')
    .insert({
      to_address: shipment.user.email,
      subject: `Ta box ${shipment.box.quarter} est en route ! 🚚`,
      content: `
        Salut ${shipment.user.first_name} !

        Bonne nouvelle : ta box ${shipment.box.name} a été expédiée ! 📦

        ${shipment.tracking_number ? `🔍 Numéro de suivi : ${shipment.tracking_number}` : ''}
        📅 Date d'expédition : ${new Date(shipment.shipping_date).toLocaleDateString('fr-FR')}

        Tu devrais la recevoir dans les prochains jours !

        L'équipe Nowme 💕
      `,
      status: 'pending'
    });
}

async function sendTrackingNotification(supabase: any, shipmentId: string) {
  const { data: shipment, error } = await supabase
    .from('box_shipments')
    .select(`
      *,
      user:user_profiles(email, first_name)
    `)
    .eq('id', shipmentId)
    .single();

  if (error) return;

  await supabase
    .from('emails')
    .insert({
      to_address: shipment.user.email,
      subject: 'Suivi de ta box Nowme 📦',
      content: `
        Salut ${shipment.user.first_name} !

        Voici les infos de suivi de ta box :

        🔍 Numéro de suivi : ${shipment.tracking_number}
        📦 Statut : ${shipment.status === 'shipped' ? 'Expédiée' : 'En transit'}
        📅 Date d'expédition : ${new Date(shipment.shipping_date).toLocaleDateString('fr-FR')}

        Tu peux suivre ta livraison avec le numéro de suivi.

        L'équipe Nowme 💕
      `,
      status: 'pending'
    });
}

async function sendDeliveryConfirmation(supabase: any, shipmentId: string) {
  const { data: shipment, error } = await supabase
    .from('box_shipments')
    .select(`
      *,
      box:club_boxes(*),
      user:user_profiles(email, first_name)
    `)
    .eq('id', shipmentId)
    .single();

  if (error) return;

  await supabase
    .from('emails')
    .insert({
      to_address: shipment.user.email,
      subject: 'Ta box est arrivée ! Raconte-nous tout 📦✨',
      content: `
        Salut ${shipment.user.first_name} !

        Ta box ${shipment.box.name} est arrivée ! 🎉

        On espère qu'elle va te faire kiffer ! N'hésite pas à :
        • Partager tes photos dans le groupe WhatsApp
        • Nous dire ce que tu en penses
        • Taguer @nowme sur Instagram

        Profite bien de tes petits trésors ! 💕

        L'équipe Nowme
      `,
      status: 'pending'
    });

  // Ajouter des points de fidélité pour la réception
  await supabase.rpc('add_reward_points', {
    user_id: shipment.user_id,
    points: 25,
    reason: 'Réception box trimestrielle'
  });
}