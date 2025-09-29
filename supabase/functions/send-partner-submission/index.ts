/// <reference lib="deno.ns" />

import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

// ✅ Types
type BusinessPayload = {
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  website?: string;
  message?: string;
  siret?: string;
  address?: string;
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

    if (!business.email || !business.name) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs obligatoires manquants (nom + email)" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1️⃣ Insert dans partners
    const { data: partner, error: insertError } = await supabase
      .from("partners")
      .insert({
        business_name: business.name,
        contact_name: business.contactName ?? null,
        contact_email: business.email,
        phone: business.phone ?? null,
        website: business.website ?? null,
        siret: business.siret ?? null,
        address: business.address ?? null,
        message: business.message ?? null,
        status: "pending",
      })
      .select("id, business_name, contact_name, contact_email")
      .single();

    if (insertError || !partner) {
      logger.error("❌ Erreur insertion partenaire:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de l’enregistrement du partenaire" }),
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

    // 3️⃣ Emails
    const adminHtml = `
      <h2 style="color:#BF2778;">Nouvelle demande de partenariat 🚀</h2>
      <p><strong>Entreprise :</strong> ${business.name}</p>
      <p><strong>Contact :</strong> ${business.contactName ?? "-"}</p>
      <p><strong>Email :</strong> ${business.email}</p>
      ${business.phone ? `<p><strong>Téléphone :</strong> ${business.phone}</p>` : ""}
      ${business.website ? `<p><strong>Site web :</strong> ${business.website}</p>` : ""}
      ${business.siret ? `<p><strong>SIRET :</strong> ${business.siret}</p>` : ""}
      ${business.address ? `<p><strong>Adresse :</strong> ${business.address}</p>` : ""}
      ${business.message ? `<p><strong>Message :</strong><br/>${business.message.replace(/\n/g, "<br/>")}</p>` : ""}
      ${offer ? `<p><strong>Offre proposée :</strong> ${offer.title} – ${offer.price}€</p>` : ""}
      <p style="margin-top:20px;">👉 Connectez-vous au dashboard admin pour approuver ou rejeter cette demande.</p>
    `;

    const confirmHtml = `
      <h2 style="color:#BF2778;">Merci pour votre demande de partenariat 🙌</h2>
      <p>Bonjour ${business.contactName ?? business.name},</p>
      <p>Nous avons bien reçu votre demande pour <strong>${business.name}</strong>.</p>
      ${offer ? `<p>Votre offre <strong>${offer.title}</strong> est enregistrée et en attente de validation.</p>` : ""}
      <p>Notre équipe va l’étudier et vous recontactera très vite.</p>
      <p style="margin-top:20px;">Cordialement,<br/>💜 L’équipe Nowme Club</p>
    `;

    await supabase.from("emails").insert([
      {
        to_address: "admin@nowme.fr",
        subject: "Nouvelle demande de partenariat",
        content: adminHtml,
        status: "pending",
      },
      {
        to_address: business.email,
        subject: "Votre demande de partenariat est en cours de validation",
        content: confirmHtml,
        status: "pending",
      },
    ]);

    // ✅ Réponse finale
    return new Response(
      JSON.stringify({
        success: true,
        partnerId: partner.id,
        offerId,
        message: "✅ Partenaire et offre enregistrés, emails en attente d’envoi",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    logger.error("❌ Erreur globale:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur inattendue" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
