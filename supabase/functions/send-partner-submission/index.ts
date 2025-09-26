// ✅ Nouveau handler avec Deno.serve
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

// ✅ Type pour le payload JSON
type PartnerPayload = {
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  website?: string;
  message?: string;
  siret?: string;
  address?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const supabase = createSupabaseClient();

    // Typage explicite du body
    const {
      name,
      contactName,
      email,
      phone,
      website,
      message,
      siret,
      address,
    } = (await req.json()) as PartnerPayload;

    if (!email || !name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Champs obligatoires manquants",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 1️⃣ Insert dans la table partners (status = pending)
    const { data: partner, error: insertError } = await supabase
      .from("partners")
      .insert({
        business_name: name,
        contact_name: contactName ?? null,
        contact_email: email,
        phone: phone ?? null,
        website: website ?? null,
        siret: siret ?? null,
        address: address ?? null,
        message: message ?? null,
        status: "pending",
      })
      .select("id, business_name, contact_name, contact_email")
      .single();

    if (insertError) {
      logger.error("❌ Erreur insertion partenaire:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur lors de l’enregistrement en base",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 2️⃣ Contenu email interne (alerte admin)
    const adminHtml = `
      <h2 style="color:#BF2778;">Nouvelle demande de partenariat 🚀</h2>
      <p><strong>Entreprise :</strong> ${name}</p>
      <p><strong>Contact :</strong> ${contactName ?? "-"}</p>
      <p><strong>Email :</strong> ${email}</p>
      ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ""}
      ${website ? `<p><strong>Site web :</strong> ${website}</p>` : ""}
      ${siret ? `<p><strong>SIRET :</strong> ${siret}</p>` : ""}
      ${address ? `<p><strong>Adresse :</strong> ${address}</p>` : ""}
      ${message ? `<p><strong>Message :</strong><br/>${message.replace(/\n/g, "<br/>")}</p>` : ""}
      <p style="margin-top:20px;">👉 Connectez-vous au dashboard admin pour approuver ou rejeter cette demande.</p>
    `;

    // 3️⃣ Contenu email confirmation au partenaire
    const confirmHtml = `
      <h2 style="color:#BF2778;">Merci pour votre demande de partenariat 🙌</h2>
      <p>Bonjour ${contactName ?? name},</p>
      <p>Nous avons bien reçu votre demande de partenariat pour <strong>${name}</strong>.</p>
      <p>Notre équipe va l’étudier et vous recontactera très vite.</p>
      <p>En attendant, n’hésitez pas à explorer notre communauté Nowme Club ✨</p>
      <p style="margin-top:20px;">Cordialement,<br/>💜 L’équipe Nowme Club</p>
    `;

    // 4️⃣ Insérer les emails dans la table "emails" (queue only)
    const { error: emailError } = await supabase.from("emails").insert([
      {
        to_address: "admin@nowme.fr",
        subject: "Nouvelle demande de partenariat",
        content: adminHtml,
        status: "pending",
      },
      {
        to_address: email,
        subject: "Votre demande de partenariat est en cours de validation",
        content: confirmHtml,
        status: "pending",
      },
    ]);

    if (emailError) {
      logger.error("❌ Erreur insertion emails:", emailError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur lors de l’enregistrement des emails",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        partnerId: partner.id,
        message: "✅ Demande enregistrée et emails en attente d’envoi",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    logger.error("❌ Erreur globale:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erreur inattendue",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
