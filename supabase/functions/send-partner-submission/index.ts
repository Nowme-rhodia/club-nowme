/// <reference lib="deno.ns" />

import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

// ✅ Types
type BusinessPayload = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  // Champs optionnels pour compatibilité avec l'ancien formulaire
  website?: string;
  siret?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  termsAccepted?: boolean;
};

type OfferPayload = {
  title: string;
  description: string;
  categorySlug: string;
  subcategorySlug: string;
  price: number;
  promoPrice?: number;
  location: string;
  coordinates?: { lat: number; lng: number };
};

// ✅ Handler principal
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const supabase = createSupabaseClient();
    const body = await req.json();

    const business: BusinessPayload = body.business ?? body;
    const offer: OfferPayload | undefined = body.offer;

    // Validation des champs requis pour la demande initiale
    if (!business.name || !business.contactName || !business.email || !business.phone || !business.message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Champs obligatoires manquants (nom entreprise, contact, email, téléphone, message)"
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1️⃣ Insert dans partners (demande initiale simplifiée)
    const { data: partner, error: insertError } = await supabase
      .from("partners")
      .insert({
        business_name: business.name,
        contact_name: business.contactName,
        contact_email: business.email,
        phone: business.phone,
        description: business.message, // Utilise 'description' au lieu de 'message'

        // Champs optionnels
        website: business.website ?? null,
        siret: business.siret ?? null,
        address: business.address ?? null,
        facebook: business.facebook ?? null,
        instagram: business.instagram ?? null,

        terms_accepted_at: business.termsAccepted ? new Date() : null,
        status: "pending",
      })
      .select("id, business_name, contact_name, contact_email")
      .single();

    if (insertError || !partner) {
      logger.error("❌ Erreur insertion partenaire:", insertError);

      // Détails de l'erreur pour le debug
      const errorDetails = insertError ? {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      } : "No partner data returned";

      logger.error("Détails de l'erreur:", errorDetails);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur lors de l'enregistrement du partenaire",
          debug: import.meta.env?.DEV ? errorDetails : undefined
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 2️⃣ Insert offre si présente
    let offerId: string | null = null;
    if (offer) {
      const { data: newOffer, error: offerError } = await supabase
        .from("offers")
        .insert({
          partner_id: partner.id,
          title: offer.title,
          description: offer.description,
          category_slug: offer.categorySlug,
          subcategory_slug: offer.subcategorySlug,
          price: offer.price,
          promo_price: offer.promoPrice ?? null,
          location: offer.location,
          latitude: offer.coordinates?.lat ?? null,
          longitude: offer.coordinates?.lng ?? null,
          status: "pending",
        })
        .select("id")
        .single();

      if (offerError) {
        logger.error("❌ Erreur insertion offre:", offerError);
      } else {
        offerId = newOffer?.id ?? null;
      }
    }

    // 3️⃣ Emails & Notifications (Direct Send via Resend)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      logger.error("❌ Missing RESEND_API_KEY");
    }

    // Fetch admins for notification
    const { data: admins, error: adminError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('is_admin', true);

    if (adminError) {
      logger.error("Error fetching admins:", adminError);
    }

    const defaultAdmins = ["rhodia.kw@gmail.com", "admin@admin.fr"];
    const dynamicAdmins = admins?.map(a => a.email).filter(e => e) || [];
    const recipientEmails = [...new Set([...defaultAdmins, ...dynamicAdmins])];

    const adminHtml = `
      <h2 style="color:#BF2778;">Nouvelle demande de partenariat 🚀</h2>
      <p><strong>Entreprise :</strong> ${business.name}</p>
      <p><strong>Contact :</strong> ${business.contactName ?? "-"}</p>
      <p><strong>Email :</strong> ${business.email}</p>
      ${business.phone ? `<p><strong>Téléphone :</strong> ${business.phone}</p>` : ""}
      ${business.website ? `<p><strong>Site web :</strong> ${business.website}</p>` : ""}
      ${business.facebook ? `<p><strong>Facebook :</strong> <a href="${business.facebook}">${business.facebook}</a></p>` : ""}
      ${business.instagram ? `<p><strong>Instagram :</strong> <a href="${business.instagram}">${business.instagram}</a></p>` : ""}
      ${business.siret ? `<p><strong>SIRET :</strong> ${business.siret}</p>` : ""}
      ${business.address ? `<p><strong>Adresse :</strong> ${business.address}</p>` : ""}
      ${business.message ? `<p><strong>Message :</strong><br/>${business.message.replace(/\n/g, "<br/>")}</p>` : ""}
      ${offer ? `<p><strong>Offre proposée :</strong> ${offer.title} – ${offer.price}€</p>` : ""}
      <p style="margin-top:20px;">👉 Connectez-vous au dashboard admin pour approuver ou rejeter cette demande.</p>
    `;

    const confirmHtml = `
      <h2 style="color:#BF2778;">Bienvenue chez Nowme ! ✨</h2>
      <p>Bonjour ${business.contactName ?? business.name},</p>
      <p>Nous avons bien reçu votre demande de partenariat pour <strong>${business.name}</strong> et nous vous en remercions !</p>
      
      <p>Chez Nowme, nous sélectionnons nos partenaires avec beaucoup de soin pour garantir la meilleure qualité à notre communauté.</p>
      
      ${offer ? `<p>Votre offre <strong>${offer.title}</strong> a bien été enregistrée.</p>` : ""}
      
      <p>Notre équipe va étudier votre profil et reviendra vers vous sous <strong>48h ouvrées</strong>.</p>
      
      <p>À très vite !</p>
      <p style="margin-top:20px;">Cordialement,<br/>💜 L’équipe Nowme Club</p>
    `;

    // Helper to send email with detailed result
    const sendDirectEmail = async (to: string, subject: string, html: string) => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Nowme Club <contact@nowme.fr>',
            to,
            subject,
            html,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.error(`Failed to send email to ${to}:`, errData);
          return { success: false, error: errData };
        }
        return { success: true, error: null };
      } catch (e: any) {
        console.error(`Exception sending email to ${to}:`, e);
        return { success: false, error: e.message };
      }
    };

    // Helper to sleep (prevent rate limiting)
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const emailInserts = [];

    // 1. Send to Admins
    for (const adminEmail of recipientEmails) {
      if (adminEmail) {
        const res = await sendDirectEmail(adminEmail, "Nouvelle demande de partenariat", adminHtml);
        emailInserts.push({
          to_address: adminEmail,
          subject: "Nouvelle demande de partenariat",
          content: adminHtml,
          status: res.success ? 'sent' : 'failed',
          sent_at: res.success ? new Date().toISOString() : null
        });
        // Wait 1s between emails to respect Resend Test Limit (2 req/sec)
        await sleep(1000);
      }
    }

    // 2. Send to Partner
    const partnerRes = await sendDirectEmail(business.email, "Bienvenue chez Nowme ! Votre demande est en cours d'examen ✨", confirmHtml);
    emailInserts.push({
      to_address: business.email,
      subject: "Bienvenue chez Nowme ! Votre demande est en cours d'examen ✨",
      content: confirmHtml,
      status: partnerRes.success ? 'sent' : 'failed',
      sent_at: partnerRes.success ? new Date().toISOString() : null
    });

    // Write history to DB
    await supabase.from("emails").insert(emailInserts);

    // ✅ Réponse finale avec debug email
    return new Response(
      JSON.stringify({
        success: true,
        partnerId: partner.id,
        offerId,
        message: "✅ Partenaire enregistré.",
        emailDebug: {
          partnerEmail: business.email,
          sent: partnerRes.success,
          error: partnerRes.error
        }
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    logger.error("❌ Erreur globale:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur inattendue", details: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
