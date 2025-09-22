import { supabase } from './supabase';

interface PartnerSubmission {
  business: {
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    siret: string;
  };
  offer: {
    title: string;
    description: string;
    categorySlug: string;
    subcategorySlug: string;
    price: number;
    promoPrice?: number;
    location: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface PartnerOffer {
  title: string;
  description: string;
  categorySlug: string;
  subcategorySlug: string;
  price?: number;
  imageUrl?: string;
  location: string;
}
export async function submitPartnerApplication(submission: PartnerSubmission) {
  try {
    // Insérer d'abord le partenaire en attente
    const { data: partner, error: partnerError } = await supabase
      .from('pending_partners')
      .insert({
        business_name: submission.business.name,
        contact_name: submission.business.contactName,
        email: submission.business.email,
        phone: submission.business.phone,
        siret: submission.business.siret,
        status: 'pending'
      })
      .select()
      .single();

    if (partnerError) throw partnerError;

    // Insérer ensuite l'offre associée
    const { error: offerError } = await supabase
      .from('pending_offers')
      .insert({
        pending_partner_id: partner.id,
        title: submission.offer.title,
        description: submission.offer.description,
        category_slug: submission.offer.categorySlug,
        subcategory_slug: submission.offer.subcategorySlug,
        price: submission.offer.price,
        location: submission.offer.location
      });

    if (offerError) throw offerError;

    return partner;
  } catch (error) {
    console.error('Error submitting partner application:', error);
    throw error;
  }
}
export async function createPartnerOffer(offer: PartnerOffer, partnerId: string) {
  try {
    const { data, error } = await supabase
      .from('pending_offers')
      .insert({
        pending_partner_id: partnerId,
        title: offer.title,
        description: offer.description,
        category_slug: offer.categorySlug,
        subcategory_slug: offer.subcategorySlug,
        price: offer.price,
        location: offer.location,
        image_url: offer.imageUrl,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating partner offer:', error);
    throw error;
  }
}

export async function getPartnerOffers(partnerId: string) {
  try {
    // Récupérer les offres en attente
    const { data: pendingOffers, error: pendingError } = await supabase
      .from('pending_offers')
      .select('*')
      .eq('pending_partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (pendingError) throw pendingError;

    // Récupérer les offres approuvées
    const { data: approvedOffers, error: approvedError } = await supabase
      .from('offers')
      .select(`
        *,
        prices:offer_prices(*),
        media:offer_media(*)
      `)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (approvedError) throw approvedError;

    return {
      pending: pendingOffers || [],
      approved: approvedOffers || []
    };
  } catch (error) {
    console.error('Error getting partner offers:', error);
    throw error;
  }
}

export async function approvePartnerOffer(offerId: string, partnerId: string) {
  try {
    // Récupérer l'offre en attente
    const { data: pendingOffer, error: pendingError } = await supabase
      .from('pending_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (pendingError) throw pendingError;

    // Créer l'offre validée
    const { data: newOffer, error: offerError } = await supabase
      .from('offers')
      .insert({
        partner_id: partnerId,
        title: pendingOffer.title,
        description: pendingOffer.description,
        category_slug: pendingOffer.category_slug,
        subcategory_slug: pendingOffer.subcategory_slug,
        location: pendingOffer.location || 'Paris',
        status: 'active'
      })
      .select('id')
      .single();

    if (offerError) throw offerError;

    // Créer le prix si spécifié
    if (pendingOffer.price) {
      const { error: priceError } = await supabase
        .from('offer_prices')
        .insert({
          offer_id: newOffer.id,
          name: 'Prix standard',
          price: pendingOffer.price,
          duration: 'Séance'
        });

      if (priceError) throw priceError;
    }

    // Ajouter l'image si spécifiée
    if (pendingOffer.image_url) {
      const { error: mediaError } = await supabase
        .from('offer_media')
        .insert({
          offer_id: newOffer.id,
          url: pendingOffer.image_url,
          type: 'image',
          order: 1
        });

      if (mediaError) throw mediaError;
    }

    // Marquer l'offre en attente comme approuvée
    const { error: updateError } = await supabase
      .from('pending_offers')
      .update({ status: 'approved' })
      .eq('id', offerId);

    if (updateError) throw updateError;

    return newOffer;
  } catch (error) {
    console.error('Error approving partner offer:', error);
    throw error;
  }
}

export async function rejectPartnerOffer(offerId: string, rejectionReason: string) {
  try {
    const { error } = await supabase
      .from('pending_offers')
      .update({ 
        status: 'rejected',
        rejection_reason: rejectionReason
      })
      .eq('id', offerId);

    if (error) throw error;
  } catch (error) {
    console.error('Error rejecting partner offer:', error);
    throw error;
  }
}