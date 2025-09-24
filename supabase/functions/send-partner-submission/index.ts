import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders, handleCors, logger } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const supabase = createSupabaseClient();
    const { name, contactName, email, phone, website, message, siret, address } = await req.json();

    if (!email || !name) {
      return new Response(JSON.stringify({
        success: false,
        error: "Champs obligatoires manquants"
      }), { status: 400, headers: corsHeaders });
    }

    // 1️⃣ Insert dans la table partners
    const { data: partner, error: insertError } = await supabase
      .from("partners")
      .insert({
        business_name: name,
        contact_name: contactName ?? null,
        email,
        contact_email: email,
        phone: phone ?? null,
        website: website ?? null,
        siret: siret ?? null,
        address: address ?? null,
        status: "pending"
      })
      .select("id")
      .single();

    if (insertError) {
      logger.error("Erreur insertion partenaire:", insertError);
      return new Response(JSON.stringify({
        success: false,
        error: "Erreur lors de l’enregistrement en base"
      }), { status: 500, headers: corsHeaders });
    }

    // 2️⃣ Email interne (alerte admin)
    const adminHtml = `
      <h2>Nouvelle demande de partenariat</h2>
      <p><strong>Entreprise :</strong> ${name}</p>
      <p><strong>Contact :</strong> ${contactName ?? "-"}</p>
      <p><strong>Email :</strong> ${email}</p>
      ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ""}
      ${website ? `<p><strong>Site web :</strong> ${website}</p>` : ""}
      ${siret ? `<p><strong>SIRET :</strong> ${siret}</p>` : ""}
      ${address ? `<p><strong>Adresse :</strong> ${address}</p>` : ""}
      ${message ? `<p><strong>Message :</strong><br/>${message.replace(/\n/g, "<br/>")}</p>` : ""}
    `;

    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>",
        to: "contact@nowme.fr",
        subject: "Nouvelle demande de partenariat",
        html: adminHtml
      })
    });

    if (!adminRes.ok) {
      const err = await adminRes.text();
      logger.error("Erreur envoi email admin Resend:", err);
    }

    // 3️⃣ Email confirmation au partenaire
    const confirmHtml = `
      <h2>Merci pour votre demande de partenariat 🙌</h2>
      <p>Bonjour ${contactName ?? name},</p>
      <p>Nous avons bien reçu votre demande de partenariat.</p>
      <p>Notre équipe va l’étudier et vous recontactera très vite.</p>
      <p>En attendant, n’hésitez pas à explorer notre communauté Nowme Club ✨</p>
      <p>Cordialement,<br/>L’équipe Nowme Club</p>
    `;

    const partnerRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>",
        to: email,
        subject: "Votre demande de partenariat est en cours de validation",
        html: confirmHtml
      })
    });

    if (!partnerRes.ok) {
      const err = await partnerRes.text();
      logger.error("Erreur envoi email partenaire Resend:", err);
    }

    return new Response(JSON.stringify({
      success: true,
      partnerId: partner.id,
      message: "Demande enregistrée et emails envoyés"
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    logger.error("Erreur globale:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Erreur inattendue"
    }), { status: 500, headers: corsHeaders });
  }
});
