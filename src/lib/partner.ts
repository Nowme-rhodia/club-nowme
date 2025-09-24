import { supabase } from './supabase';
import { sendEmail } from './email'; // ✅ centralisation des emails

interface PartnerSubmission {
  business: {
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address?: string;
    siret?: string;
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

/**
 * 🔹 Soumission d’une demande partenaire (status = pending)
 */
export async function submitPartnerApplication(submission: PartnerSubmission) {
  try {
    const { data, error } = await supabase
      .from('partners')
      .insert({
        business_name: submission.business.name,
        contact_name: submission.business.contactName,
        email: submission.business.email,
        phone: submission.business.phone,
        siret: submission.business.siret,
        address: submission.business.address,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error submitting partner application:', error);
    throw error;
  }
}

/**
 * 🔹 Création d’une offre (status = draft tant que le partenaire est en attente)
 */
export async function createPartnerOffer(offer: PartnerOffer, partnerId: string) {
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert({
        partner_id: partnerId,
        title: offer.title,
        description: offer.description,
        category_slug: offer.categorySlug,
        subcategory_slug: offer.subcategorySlug,
        price: offer.price,
        location: offer.location,
        image_url: offer.imageUrl,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error creating partner offer:', error);
    throw error;
  }
}

/**
 * 🔹 Récupérer les offres d’un partenaire
 */
export async function getPartnerOffers(partnerId: string) {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(
        `
        *,
        prices:offer_prices(*),
        media:offer_media(*)
      `
      )
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Error getting partner offers:', error);
    throw error;
  }
}

/**
 * 🔹 Approuver un partenaire
 */
export async function approvePartner(partnerId: string) {
  try {
    const { data, error } = await supabase
      .from('partners')
      .update({ status: 'approved' })
      .eq('id', partnerId)
      .select()
      .single();

    if (error) throw error;

    // ✅ envoi email d’approbation
    if (data?.email) {
      const signupUrl = `${window.location.origin}/partner/signup?token=${crypto.randomUUID()}`;
      await sendEmail({
        to: data.email,
        subject: 'Votre demande de partenariat a été approuvée',
        content: `
          Félicitations ${data.contact_name} 🎉
          
          Votre demande de partenariat a été approuvée !
          Cliquez sur ce lien pour finaliser votre inscription :
          ${signupUrl}
          
          Ce lien est valable 7 jours.
          
          L’équipe Nowme Club
        `
      });
    }

    return data;
  } catch (error) {
    console.error('❌ Error approving partner:', error);
    throw error;
  }
}

/**
 * 🔹 Rejeter un partenaire
 */
export async function rejectPartner(partnerId: string, reason?: string) {
  try {
    const { data, error } = await supabase
      .from('partners')
      .update({
        status: 'rejected',
        admin_notes: reason ?? null
      })
      .eq('id', partnerId)
      .select()
      .single();

    if (error) throw error;

    // ✅ envoi email de refus
    if (data?.email) {
      await sendEmail({
        to: data.email,
        subject: 'Votre demande de partenariat n’a pas été retenue',
        content: `
          Bonjour ${data.contact_name},
          
          Après étude de votre demande, nous ne pouvons pas y donner suite pour le moment.
          ${reason ? `Raison : ${reason}` : ''}
          
          Vous pouvez soumettre une nouvelle demande ultérieurement.
          
          L’équipe Nowme Club
        `
      });
    }

    return data;
  } catch (error) {
    console.error('❌ Error rejecting partner:', error);
    throw error;
  }
}
