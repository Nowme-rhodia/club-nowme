
import { createClient } from "jsr:@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1"
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

console.log("Send Confirmation Email Function Invoked (v7 - NPM Native)")

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
        const payload = await req.json()

        console.log("Webhook Payload:", payload)

        const booking = payload.record || payload
        if (!booking || !booking.id) {
            throw new Error("Invalid payload: No booking ID found")
        }

        const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', booking.id)
            .single()

        if (bookingError || !bookingData) {
            console.error("Booking not found:", bookingError)
            throw new Error("Booking not found")
        }

        const [userResponse, offerResponse, partnerResponse, variantResponse] = await Promise.all([
            supabase.from('user_profiles').select('first_name, last_name, email').eq('user_id', bookingData.user_id).single(),
            supabase.from('offers').select('title, is_online, booking_type, calendly_url, external_link').eq('id', bookingData.offer_id).single(),
            supabase.from('partners').select('business_name, description, website, address, contact_email, notification_settings, siret, tva_intra').eq('id', bookingData.partner_id).single(),
            bookingData.variant_id ? supabase.from('offer_variants').select('name, price').eq('id', bookingData.variant_id).single() : Promise.resolve({ data: null, error: null })
        ])

        if (userResponse.error) console.error("User fetch error:", userResponse.error)

        let user = userResponse.data || { first_name: '', last_name: '', email: '' }
        const offer = offerResponse.data || { title: 'Offre inconnue' }
        const partner = partnerResponse.data || { business_name: 'Partenaire', address: '', siret: '', tva_intra: '', contact_email: '' }
        const variant = variantResponse.data

        // Email Fallback
        if (!user.email) {
            const { data: authUser } = await supabase.auth.admin.getUserById(bookingData.user_id)
            if (authUser?.user?.email) user.email = authUser.user.email
        }

        const buyerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Client'
        const offerTitle = offer.title
        const variantName = variant?.name ? ` - Option ${variant.name}` : ''
        const fullItemName = `${offerTitle}${variantName}`
        const price = bookingData.amount || variant?.price || 0

        const partnerName = partner?.business_name || 'Nowme Partner'
        const partnerAddress = partner?.address || ''
        const partnerSiret = partner?.siret || ''
        const partnerTva = partner?.tva_intra || ''
        const partnerEmail = partner?.contact_email || 'Pas d\'email de contact'

        // Generate PDF
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage()
        const { width, height } = page.getSize()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        const drawText = (text: string, x: number, y: number, size = 12, fontToUse = font) => {
            page.drawText(text, { x, y, size, font: fontToUse, color: rgb(0, 0, 0) })
        }

        drawText("FACTURE / REÇU", 50, height - 50, 20, boldFont)
        drawText(`Émise par NOWME (Mandataire)`, 50, height - 75, 10, font)

        drawText(`Date: ${new Date(bookingData.booking_date).toLocaleDateString('fr-FR')}`, 400, height - 50, 10)
        drawText(`Facture #: ${bookingData.id.slice(0, 8).toUpperCase()}`, 400, height - 65, 10)

        let currentY = height - 110
        drawText("Vendeur (Prestataire) :", 50, currentY, 10, boldFont); currentY -= 15;
        drawText(partnerName, 50, currentY, 10); currentY -= 15;
        if (partnerAddress) { drawText(partnerAddress, 50, currentY, 10); currentY -= 15; }
        if (partnerSiret) { drawText(`SIRET : ${partnerSiret}`, 50, currentY, 10); currentY -= 15; }
        if (partnerTva) { drawText(`TVA : ${partnerTva}`, 50, currentY, 10); currentY -= 15; }

        currentY = height - 110;
        drawText("Émetteur (Mandataire) :", 300, currentY, 10, boldFont); currentY -= 15;
        drawText("NOWME", 300, currentY, 10); currentY -= 15;
        drawText("59 RUE du Ponthieu, Bureau 326", 300, currentY, 10); currentY -= 15;
        drawText("75008 Paris, FRANCE", 300, currentY, 10); currentY -= 15;
        drawText("SIREN : 933 108 011", 300, currentY, 10); currentY -= 15;

        drawText("Acheteur :", 50, height - 200, 10, boldFont)
        drawText(buyerName, 50, height - 215, 10)
        drawText(user.email || '', 50, height - 230, 10)

        page.drawLine({ start: { x: 50, y: height - 250 }, end: { x: width - 50, y: height - 250 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
        drawText("Description", 50, height - 270, 10, boldFont)
        drawText("Montant", 450, height - 270, 10, boldFont)
        drawText(fullItemName, 50, height - 300, 10)
        drawText(`${price.toFixed(2)} €`, 450, height - 300, 10)

        page.drawLine({ start: { x: 50, y: height - 330 }, end: { x: width - 50, y: height - 330 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
        drawText("TOTAL PAYÉ", 350, height - 360, 12, boldFont)
        drawText(`${price.toFixed(2)} €`, 450, height - 360, 12, boldFont)

        page.drawLine({ start: { x: 50, y: 120 }, end: { x: width - 50, y: 120 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
        drawText("Facture émise au nom et pour le compte de " + partnerName + " par NOWME.", 50, 100, 8, font)
        drawText("NOWME agit en qualité de mandataire de facturation conformément aux dispositions légales.", 50, 88, 8, font)
        drawText("TVA applicable : Celle du Vendeur (Prestataire).", 50, 76, 8, font)

        drawText("Besoin d'aide ?", 50, 50, 8, boldFont)
        drawText("Problème avec la commande : Contactez le prestataire à " + partnerEmail, 50, 38, 8, font)
        drawText("Problème technique : Contactez NOWME à support@nowme.fr", 50, 26, 8, font)

        const pdfBytes = await pdfDoc.save()
        const pdfBase64 = btoa(String.fromCharCode(...pdfBytes))

        // Email Logic
        const isOnline = offer.is_online || false;
        let logisticsHtml = '';
        let dateDisplay = "Date à définir";
        let locationDisplay = partnerAddress;

        const { data: offerDetails } = await supabase
            .from('offers')
            .select('service_zones, event_start_date')
            .eq('id', bookingData.offer_id)
            .single();

        const serviceZones = offerDetails?.service_zones || [];
        const isAtHome = serviceZones.length > 0;
        const eventDate = bookingData.scheduled_at || offerDetails?.event_start_date;

        if (eventDate) {
            const dateObj = new Date(eventDate);
            const frenchDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(dateObj);
            const frenchTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(dateObj).replace(':', 'h');
            dateDisplay = `${frenchDate} à ${frenchTime}`;
        } else if (offer.calendly_url || isAtHome) {
            dateDisplay = "À choisir lors de la prise de RDV";
        }

        if (bookingData.meeting_location && bookingData.meeting_location.trim().length > 5) {
            locationDisplay = bookingData.meeting_location;
        } else if (isAtHome) {
            locationDisplay = "Adresse à définir / À domicile";
        } else {
            locationDisplay = partnerAddress || "Lieu à confirmer par le partenaire";
        }

        if (isOnline) {
            logisticsHtml = `
                    <h3>Accès à votre expérience en ligne</h3>
                    <p>C'est un événement 100% en ligne.</p>
                    <p>Vous retrouverez le lien de connexion dans votre espace "Mes Réservations" ou ci-dessous si disponible.</p>
                    ${offer.external_link ? `<p style="margin: 15px 0;"><a href="${offer.external_link}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Lien de la visio (Zoom/Meet)</a></p>` : ''}
                    ${offer.calendly_url ? `<p><a href="${offer.calendly_url}">Lien de connexion / Prise de RDV</a></p>` : ''}
                    <p style="margin-top: 20px;"><a href="${Deno.env.get("PUBLIC_SITE_URL")}/mes-reservations" style="background-color: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir ma réservation</a></p>
                 `;
        } else {
            logisticsHtml = `
                <h3>Détails du Rendez-vous</h3>
                <p style="margin-bottom: 5px;"><strong>📅 Date & Heure :</strong> ${dateDisplay}</p>
                <p style="margin-bottom: 20px;"><strong>📍 Lieu :</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationDisplay)}">${locationDisplay}</a></p>
                ${!isAtHome ? `<hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 15px 0;" />` : ''}
                <p>L'équipe <strong>${partnerName}</strong> a hâte de vous accueillir.</p>
                <p>Pensez à présenter ce mail ou votre espace client lors de votre arrivée.</p>
                <p style="margin-top: 30px;"><a href="${Deno.env.get("PUBLIC_SITE_URL")}/mes-reservations" style="background-color: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir ma réservation</a></p>
             `;
        }

        const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            <h1 style="color: #0F172A;">Félicitations ${user.first_name || ''} ! 🎉</h1>
            <p>Votre réservation pour <strong>${fullItemName}</strong> est bien confirmée.</p>
            <p><strong>Montant payé :</strong> ${price.toFixed(2)} €</p>
            <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
            ${logisticsHtml}
            <p style="margin-top: 40px; font-size: 14px;">Vous trouverez votre facture en pièce jointe de ce mail.</p>
            <hr style="border: 1px solid #e2e8f0; margin: 30px 0;" />
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #0F172A;">Besoin d'aide ?</h3>
                <p style="margin-bottom: 8px;"><strong>🏷️ Problème avec votre commande ?</strong><br/>Veuillez contacter directement le prestataire : <a href="mailto:${partnerEmail}" style="color: #BE185D;">${partnerEmail}</a></p>
                <p style="margin-top: 16px;"><strong>💻 Problème technique ?</strong><br/>Contactez l'équipe NOWME : <a href="mailto:support@nowme.fr" style="color: #BE185D;">support@nowme.fr</a></p>
            </div>
        </div>
      `

        if (!user.email) {
            return new Response(JSON.stringify({ success: false, error: "No email address found." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })
        }

        const emailData = await resend.emails.send({
            from: "Nowme <contact@nowme.fr>",
            to: [user.email],
            subject: `Votre réservation confirmée : ${offerTitle}`,
            html: htmlContent,
            attachments: [{ filename: `Facture-${bookingData.id.slice(0, 8)}.pdf`, content: pdfBase64 }],
        })

        // Partner Notification
        const partnerSettings = partner.notification_settings || { new_booking: true }
        if (partnerSettings.new_booking !== false && partner.contact_email) {
            const partnerHtmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #0F172A;">Nouvelle réservation ! 🎉</h1>
                    <p>Bonne nouvelle, vous avez reçu une nouvelle réservation pour <strong>${fullItemName}</strong>.</p>
                    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <h3 style="margin-top: 0; color: #334155; font-size: 16px;">Détails de la réservation</h3>
                        <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${dateDisplay}</p>
                        ${isAtHome ? `<p style="margin: 5px 0;"><strong>📍 Lieu :</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationDisplay)}">${locationDisplay}</a></p>` : ''}
                        ${variantName ? `<p style="margin: 5px 0;"><strong>🔹 Option :</strong> ${variant.name}</p>` : ''}
                        <p style="margin: 5px 0;"><strong>💰 Montant :</strong> ${price.toFixed(2)} €</p>
                    </div>
                    <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #dcfce7;">
                        <h3 style="margin-top: 0; color: #166534; font-size: 16px;">Coordonnées Client</h3>
                        <p style="margin: 5px 0;"><strong>👤 Nom :</strong> ${buyerName}</p>
                        <p style="margin: 5px 0;"><strong>📧 Email :</strong> <a href="mailto:${user.email}">${user.email}</a></p>
                    </div>
                    <p>Connectez-vous à votre espace partenaire pour voir les détails et gérer cette réservation.</p>
                    <p style="margin-top: 30px;"><a href="${Deno.env.get("PUBLIC_SITE_URL")}/partner/bookings" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Gérer mes réservations</a></p>
                </div>
            `
            await resend.emails.send({
                from: "Nowme <contact@nowme.fr>",
                to: [partner.contact_email],
                subject: `Nouvelle réservation : ${buyerName} - ${offerTitle}`,
                html: partnerHtmlContent,
            })
            await supabase.from('partner_notifications').insert({
                partner_id: bookingData.partner_id,
                type: 'new_booking',
                title: 'Nouvelle réservation !',
                content: `${buyerName} a réservé ${fullItemName}.`,
                data: { booking_id: bookingData.id }
            })
        }

        if (emailData.error) {
            return new Response(JSON.stringify({ success: false, error: emailData.error }), { headers: corsHeaders, status: 200 })
        }

        return new Response(JSON.stringify(emailData), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })

    } catch (error: any) {
        console.error("Error in send-confirmation-email:", error)
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })
    }
})
