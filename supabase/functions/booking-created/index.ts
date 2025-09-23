// supabase/functions/booking-created/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Client Supabase avec Service Role
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  try {
    // 1️⃣ Récupérer les events non traités
    const { data: events, error: evError } = await supabase
      .from("booking_events")
      .select("*")
      .is("processed_at", null)
      .limit(10);

    if (evError) throw evError;
    if (!events || events.length === 0) {
      return new Response("⏸ Aucun nouvel event", { status: 200 });
    }

    for (const e of events) {
      const record = e.payload;
      const offerId = record.offer_id;
      const userId = record.user_id;

      // 2️⃣ Infos offre
      const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select("id, title, partner_id")
        .eq("id", offerId)
        .single();
      if (offerError || !offer) throw new Error("Erreur récupération offre");

      // 3️⃣ Infos partenaire
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("business_name, contact_email")
        .eq("id", offer.partner_id)
        .single();
      if (partnerError || !partner) throw new Error("Erreur récupération partenaire");

      // 4️⃣ Infos abonnée
      const { data: user, error: userError } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email")
        .eq("id", userId) // ⚠️ user_id dans bookings = user_profiles.id
        .single();
      if (userError || !user) throw new Error("Erreur récupération abonnée");

      // 5️⃣ Construire email
      const subject = `Nouvelle réservation - ${offer.title}`;
      const textMessage = `
Nouvelle réservation sur Nowme Club :

👩 ${user.first_name} ${user.last_name} (${user.email})
🎁 Offre : ${offer.title}
🏢 Partenaire : ${partner.business_name}
`;
      const htmlMessage = `
  <div style="font-family: Arial, sans-serif; line-height:1.5; color:#333;">
    <h2>✨ Nouvelle réservation confirmée ✨</h2>
    <ul>
      <li><strong>👩 Abonnée :</strong> ${user.first_name} ${user.last_name} (${user.email})</li>
      <li><strong>🎁 Offre :</strong> ${offer.title}</li>
      <li><strong>🏢 Partenaire :</strong> ${partner.business_name}</li>
    </ul>
    <p>📊 Consultez la réservation dans votre dashboard Nowme Club.</p>
  </div>
`;

      // 6️⃣ Envoi via Resend
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Nowme Club <contact@nowme.fr>",
          to: [partner.contact_email || "contact@nowme.fr"],
          subject,
          text: textMessage,
          html: htmlMessage,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("❌ Erreur Resend:", errText);
        continue; // ne bloque pas les autres events
      }

      // 7️⃣ Marquer l’event comme traité
      await supabase
        .from("booking_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", e.id);

      console.log(`✅ Email envoyé pour booking ${record.id}`);
    }

    return new Response("✅ Events traités", { status: 200 });
  } catch (err) {
    console.error("Erreur booking-created:", err);
    return new Response("Erreur booking-created: " + err.message, { status: 500 });
  }
});
