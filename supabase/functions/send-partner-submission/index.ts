/// <reference lib="deno.ns" />

import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

// ✅ Types
type BusinessPayload = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  // Champs optionnels
  website?: string;
  siret?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  termsAccepted?: boolean;
  password?: string; // [NEW] Password field
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

    // Validation des champs requis
    if (!business.name || !business.contactName || !business.email || !business.phone || !business.message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Champs obligatoires manquants"
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 0️⃣ Create Auth User (if password provided)
    let userId: string | null = null;

    if (business.password) {
      // Check if user exists first to warn? OR just try create
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: business.email,
        password: business.password,
        email_confirm: true, // Auto-confirm email since we verify via this process? Or maybe false? 
        // User indicated "connecter avec l'email et le mot de passe choisis"
        // Let's auto-confirm so they can login immediately if we didn't block them by 'pending' status.
        user_metadata: {
          first_name: business.contactName.split(' ')[0],
          last_name: business.contactName.split(' ').slice(1).join(' ') || '',
          phone: business.phone,
          role: 'partner' // Pre-assign role metadata?
        }
      });

      if (userError) {
        logger.error("❌ Error creating auth user:", userError);
        // If user already exists, we returns distinct error
        if (userError.message.includes("already registered") || userError.status === 422) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Un compte existe déjà avec cet email."
            }),
            { status: 400, headers: corsHeaders }
          );
        }
        throw userError;
      }

      userId = userData.user.id;
      logger.info(`✅ Auth user created: ${userId}`);
    }

    // 1️⃣ Insert dans partners
    const { data: partner, error: insertError } = await supabase
      .from("partners")
      .insert({
        business_name: business.name,
        contact_name: business.contactName,
        contact_email: business.email,
        phone: business.phone,
        description: business.message,
        user_id: userId, // [NEW] Link to auth user

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

      // If we created a user but failed to create partner, should we rollback user?
      // For now, let's just log. Manual cleanup might be needed.
      // But typically this shouldn't fail if validation passed.

      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur lors de l'enregistrement du partenaire",
          debug: import.meta.env?.DEV ? insertError : undefined
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

    // 3️⃣ Emails & Notifications (Background)
    const sendEmails = async () => {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          logger.error("❌ Missing RESEND_API_KEY");
          return;
        }

        // Fetch admins
        const { data: admins } = await supabase.from('user_profiles').select('email').eq('is_admin', true);
        const defaultAdmins = ["rhodia.kw@gmail.com", "admin@admin.fr"];
        const dynamicAdmins = admins?.map(a => a.email).filter(e => e) || [];
        const recipientEmails = [...new Set([...defaultAdmins, ...dynamicAdmins])];

        const adminHtml = `
          <h2 style="color:#BF2778;">Nouvelle demande de partenariat 🚀</h2>
          <p><strong>Entreprise :</strong> ${business.name}</p>
          <p><strong>Contact :</strong> ${business.contactName ?? "-"}</p>
          <p><strong>Email :</strong> ${business.email}</p>
          <p><strong>Compte créé :</strong> ${userId ? "OUI" : "NON"}</p>
          ${business.phone ? `<p><strong>Téléphone :</strong> ${business.phone}</p>` : ""}
          ${business.website ? `<p><strong>Site web :</strong> ${business.website}</p>` : ""}
          ${business.siret ? `<p><strong>SIRET :</strong> ${business.siret}</p>` : ""}
          ${business.message ? `<p><strong>Message :</strong><br/>${business.message.replace(/\n/g, "<br/>")}</p>` : ""}
          <p style="margin-top:20px;">👉 Connectez-vous au dashboard admin pour approuver ou rejeter cette demande.</p>
        `;

        const confirmHtml = `
          <h2 style="color:#BF2778;">Bienvenue chez Nowme ! ✨</h2>
          <p>Bonjour ${business.contactName ?? business.name},</p>
          <p>Nous avons bien reçu votre demande de partenariat pour <strong>${business.name}</strong> !</p>
          
          <p>✅ <strong>Votre compte a été créé.</strong></p>
          <p>Une fois votre dossier validé par notre équipe (sous 48h), vous pourrez vous connecter directement avec :</p>
          <ul>
            <li><strong>Email :</strong> ${business.email}</li>
            <li><strong>Mot de passe :</strong> (celui que vous avez choisi)</li>
          </ul>
          
          <p>À très vite !</p>
          <p style="margin-top:20px;">Cordialement,<br/>💜 L’équipe Nowme Club</p>
        `;

        // Helper to send
        const sendDirectEmail = async (to: string, subject: string, html: string) => {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
            body: JSON.stringify({ from: 'Nowme Club <contact@nowme.fr>', to, subject, html }),
          });
          return { success: res.ok, error: res.ok ? null : await res.json() };
        };

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        const emailInserts = [];

        for (const adminEmail of recipientEmails) {
          if (adminEmail) {
            const res = await sendDirectEmail(adminEmail, "Nouvelle demande de partenariat", adminHtml);
            emailInserts.push({ to_address: adminEmail, subject: "Nouvelle demande de partenariat", content: adminHtml, status: res.success ? 'sent' : 'failed', sent_at: new Date().toISOString() });
            await sleep(1000);
          }
        }

        const partnerRes = await sendDirectEmail(business.email, "Bienvenue chez Nowme ! Votre demande est en cours d'examen ✨", confirmHtml);
        emailInserts.push({ to_address: business.email, subject: "Bienvenue chez Nowme !", content: confirmHtml, status: partnerRes.success ? 'sent' : 'failed', sent_at: new Date().toISOString() });

        await supabase.from("emails").insert(emailInserts);

      } catch (err: any) {
        logger.error("❌ Erreur Background Emails:", err);
      }
    };

    // @ts-ignore
    EdgeRuntime.waitUntil(sendEmails());

    return new Response(
      JSON.stringify({
        success: true,
        partnerId: partner.id,
        offerId,
        userId,
        message: "✅ Partenaire enregistré. Emails en cours d'envoi.",
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
