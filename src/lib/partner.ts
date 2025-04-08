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