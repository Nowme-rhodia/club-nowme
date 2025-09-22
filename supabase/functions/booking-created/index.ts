// supabase/functions/booking-created/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Client Supabase avec Service Role
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("📩 Nouvelle réservation reçue:", payload);

    // ✅ Tolérance aux 2 formats : { record: {...} } ou directement {...}
    const record = payload.record || payload;

    const bookingId = record.id;
    const offerId = record.offer_id;
    const userId = record.user_id;

    // ---- 1) Récupérer infos de l’offre ----
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("id, title, partner_id")
      .eq("id", offerId)
      .single();

    if (offerError || !offer) throw new Error("Erreur récupération offre");

    // ---- 2) Récupérer infos du partenaire ----
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("business_name, contact_email")
      .eq("id", offer.partner_id)
      .single();

    if (partnerError || !partner) throw new Error("Erreur récupération partenaire");

    // ---- 3) Récupérer infos de l’abonnée ----
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email")
      .eq("user_id", userId)
      .single();

    if (userError || !user) throw new Error("Erreur récupération abonnée");

    // ---- 4) Construire l’email ----
    const subject = `Nouvelle réservation - ${offer.title}`;

    const textMessage = `
Bonjour,

✅ Une nouvelle réservation vient d'être effectuée sur Nowme Club !

👩 Abonnée : ${user.first_name || ""} ${user.last_name || ""} (${user.email})
🎁 Offre : ${offer.title}
🏢 Partenaire : ${partner.business_name}

Vous pouvez consulter cette réservation dans le dashboard Nowme Club.

À très vite,  
Nowme Team
    `;

    const htmlMessage = `
  <div style="font-family: Arial, sans-serif; line-height:1.5; color:#333;">
    <h2>✨ Nouvelle réservation confirmée ✨</h2>
    <p>Une nouvelle réservation vient d’être effectuée sur <strong>Nowme Club</strong> :</p>
    <ul>
      <li><strong>👩 Abonnée :</strong> ${user.first_name || ""} ${user.last_name || ""} (${user.email})</li>
      <li><strong>🎁 Offre :</strong> ${offer.title}</li>
      <li><strong>🏢 Partenaire :</strong> ${partner.business_name}</li>
    </ul>
    <p>📊 Vous pouvez consulter cette réservation dans votre dashboard Nowme Club.</p>
    <br />
    <p style="color:#BF2778; font-weight:bold;">💖 L’équipe Nowme</p>
  </div>
    `;

    // ---- 5) Envoi via Resend ----
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nowme Club <contact@nowme.fr>", // ton domaine validé dans Resend
        to: [partner.contact_email, "contact@nowme.fr"],
        subject,
        text: textMessage,
        html: htmlMessage,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      throw new Error("❌ Erreur envoi email Resend: " + errText);
    }

    return new Response("✅ Notification envoyée", { status: 200 });
  } catch (err) {
    console.error("Erreur booking-created:", err);
    return new Response("Erreur booking-created: " + err.message, { status: 500 });
  }
});
