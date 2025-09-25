import { supabase } from './supabase';

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
        contact_email: submission.business.email,
        phone: submission.business.phone,
        siret: submission.business.siret,
        address: submission.business.address,
        status: 'pending',
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
        status: 'draft',
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
    const { data: partner, error } = await supabase
      .from('partners')
      .update({ status: 'approved' })
      .eq('id', partnerId)
      .select()
      .single();

    if (error) throw error;

    if (partner?.contact_email) {
      const signupUrl = `${window.location.origin}/partner/signup?token=${crypto.randomUUID()}`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
          <h2 style="color:#BF2778;">Félicitations ${partner.contact_name} 🎉</h2>
          <p>Votre demande de partenariat avec <strong>${partner.business_name}</strong> a été approuvée !</p>
          <p>Vous pouvez maintenant créer votre mot de passe et accéder à votre espace partenaire.</p>
          <p style="margin:20px 0;">
            <a href="${signupUrl}" 
              style="display:inline-block; padding:12px 24px; background:#BF2778; color:#fff; text-decoration:none; border-radius:8px;">
              👉 Créer mon mot de passe
            </a>
          </p>
          <p>Ce lien est valable 7 jours.</p>
          <p style="margin-top:20px;">À très vite,<br/>💜 L’équipe Nowme Club</p>
        </div>
      `;

      const { error: emailError } = await supabase.from('emails').insert([
        {
          to_address: partner.contact_email,
          subject: 'Votre partenariat Nowme Club est validé 🎉',
          content: htmlContent,
          status: 'pending',
        },
      ]);

      if (emailError) throw emailError;
    }

    return partner;
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
    const { data: partner, error } = await supabase
      .from('partners')
      .update({
        status: 'rejected',
        admin_notes: reason ?? null,
      })
      .eq('id', partnerId)
      .select()
      .single();

    if (error) throw error;

    if (partner?.contact_email) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
          <h2 style="color:#BF2778;">Bonjour ${partner.contact_name},</h2>
          <p>Après étude de votre demande de partenariat pour <strong>${partner.business_name}</strong>, nous ne pouvons pas y donner suite pour le moment.</p>
          ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ""}
          <p>Vous pouvez soumettre une nouvelle demande ultérieurement.</p>
          <p style="margin-top:20px;">Merci pour l’intérêt que vous portez à Nowme Club 💜</p>
        </div>
      `;

      const { error: emailError } = await supabase.from('emails').insert([
        {
          to_address: partner.contact_email,
          subject: 'Votre demande de partenariat n’a pas été retenue',
          content: htmlContent,
          status: 'pending',
        },
      ]);

      if (emailError) throw emailError;
    }

    return partner;
  } catch (error) {
    console.error('❌ Error rejecting partner:', error);
    throw error;
  }
}
