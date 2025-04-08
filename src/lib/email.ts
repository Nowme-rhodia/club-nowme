import { supabase } from './supabase';

interface EmailData {
  to: string;
  subject: string;
  content: string;
}

interface PartnerSubmission {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  offer: {
    title: string;
    description: string;
    category: string;
    price: number;
    location: string;
  };
}

export async function sendEmail({ to, subject, content }: EmailData) {
  try {
    const { data: email, error: dbError } = await supabase
      .from('emails')
      .insert({
        to_address: to,
        subject,
        content,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const { error: sendError } = await supabase.functions.invoke('send-email', {
      body: { to, subject, content }
    });

    if (sendError) throw sendError;

    return { success: true, email };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendPartnerSubmissionEmail(submission: PartnerSubmission) {
  return sendEmail({
    to: 'contact@nowme.fr',
    subject: 'Nouvelle demande de partenariat',
    content: `
      Nouvelle demande de partenariat reçue !

      Informations du partenaire :
      - Entreprise : ${submission.businessName}
      - Contact : ${submission.contactName}
      - Email : ${submission.email}
      - Téléphone : ${submission.phone}

      Détails de l'offre :
      - Titre : ${submission.offer.title}
      - Description : ${submission.offer.description}
      - Catégorie : ${submission.offer.category}
      - Prix : ${submission.offer.price}€
      - Localisation : ${submission.offer.location}

      Vous pouvez gérer cette demande depuis le tableau de bord administrateur.
    `
  });
}

export async function sendPartnerConfirmationEmail(submission: PartnerSubmission) {
  return sendEmail({
    to: submission.email,
    subject: 'Confirmation de votre demande de partenariat',
    content: `
      Bonjour ${submission.contactName},

      Nous avons bien reçu votre demande de partenariat pour ${submission.businessName}.

      Récapitulatif de votre demande :
      - Offre : ${submission.offer.title}
      - Description : ${submission.offer.description}
      - Catégorie : ${submission.offer.category}
      - Prix : ${submission.offer.price}€
      - Localisation : ${submission.offer.location}

      Notre équipe va étudier votre demande dans les plus brefs délais.
      Vous recevrez une réponse par email dans un délai maximum de 48h.

      Cordialement,
      L'équipe Kiff Community
    `
  });
}