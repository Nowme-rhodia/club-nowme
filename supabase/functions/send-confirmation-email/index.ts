import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1"
import { Resend } from "https://esm.sh/resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    // Handle CORS preflight
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

        // 1. Fetch Details Separately (Waterfall/Parallel)

        // A. Fetch Booking with IDs to get fresh status and foreign keys
        const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', booking.id)
            .single()

        if (bookingError || !bookingData) {
            console.error("Booking not found:", bookingError)
            throw new Error("Booking not found")
        }

        // B. Parallel Fetch of related entities
        const [userResponse, offerResponse, partnerResponse, variantResponse] = await Promise.all([
            supabase.from('user_profiles').select('first_name, last_name, email').eq('user_id', bookingData.user_id).single(),
            supabase.from('offers').select('title, is_online, booking_type, calendly_url').eq('id', bookingData.offer_id).single(),
            supabase.from('partners').select('business_name, description, website, address, contact_email, notification_settings, siret, tva_intra').eq('id', bookingData.partner_id).single(),
            bookingData.variant_id ? supabase.from('offer_variants').select('name, price').eq('id', bookingData.variant_id).single() : Promise.resolve({ data: null, error: null })
        ])

        if (userResponse.error) console.error("User fetch error:", userResponse.error)

        let user = userResponse.data || { first_name: '', last_name: '', email: '' }
        const offer = offerResponse.data || { title: 'Offre inconnue' }
        const partner = partnerResponse.data || { business_name: 'Partenaire', address: '', siret: '', tva_intra: '', contact_email: '' }
        const variant = variantResponse.data

        // [CRITICAL FIX] 2. Robust Email Fetching
        // if user_profiles email is missing, try Auth Admin API
        if (!user.email) {
            console.log(`Email missing in user_profile for user_id: ${bookingData.user_id}. Attempting to fetch from Auth Admin...`)
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(bookingData.user_id)

            if (authError) {
                console.error("Error fetching from Auth:", authError)
            } else if (authUser?.user?.email) {
                user.email = authUser.user.email
                console.log("✅ Email found in Auth:", user.email)
            } else {
                console.warn("❌ No email found in Auth either.")
            }
        } else {
            console.log("✅ Email found in user_profiles:", user.email)
        }

        const buyerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Client'
        const offerTitle = offer.title
        const variantName = variant?.name ? ` - Option ${variant.name}` : ''
        const fullItemName = `${offerTitle}${variantName}`

        // [CRITICAL FIX] 3. Price Validation
        // Priority: Booking Amount (Actual Paid) > Variant Price > 0
        const price = bookingData.amount || variant?.price || 0
        console.log(`Price Check: Booking Amount=${bookingData.amount}, Variant Price=${variant?.price}, Final Price=${price}`)

        const partnerName = partner?.business_name || 'Nowme Partner'
        const partnerAddress = partner?.address || ''
        const partnerSiret = partner?.siret || ''
        const partnerTva = partner?.tva_intra || ''
        const partnerEmail = partner?.contact_email || 'Pas d\'email de contact'

        // 4. Generate PDF Invoice
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage()
        const { width, height } = page.getSize()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        const drawText = (text: string, x: number, y: number, size = 12, fontToUse = font) => {
            page.drawText(text, { x, y, size, font: fontToUse, color: rgb(0, 0, 0) })
        }

        // Invoice Header
        drawText("FACTURE / REÇU", 50, height - 50, 20, boldFont)
        drawText(`Émise par NOWME (Mandataire)`, 50, height - 75, 10, font)

        drawText(`Date: ${new Date(bookingData.booking_date).toLocaleDateString('fr-FR')}`, 400, height - 50, 10)
        drawText(`Facture #: ${bookingData.id.slice(0, 8).toUpperCase()}`, 400, height - 65, 10)

        // Seller Info (The Partner)
        let currentY = height - 110
        drawText("Vendeur (Prestataire) :", 50, currentY, 10, boldFont); currentY -= 15;
        drawText(partnerName, 50, currentY, 10); currentY -= 15;
        if (partnerAddress) {
            drawText(partnerAddress, 50, currentY, 10); currentY -= 15;
        }
        if (partnerSiret) {
            drawText(`SIRET : ${partnerSiret}`, 50, currentY, 10); currentY -= 15;
        }
        if (partnerTva) {
            drawText(`TVA : ${partnerTva}`, 50, currentY, 10); currentY -= 15;
        }

        // Mandataire Info (NOWME)
        currentY = height - 110;
        drawText("Émetteur (Mandataire) :", 300, currentY, 10, boldFont); currentY -= 15;
        drawText("NOWME", 300, currentY, 10); currentY -= 15;
        drawText("59 RUE du Ponthieu, Bureau 326", 300, currentY, 10); currentY -= 15;
        drawText("75008 Paris, FRANCE", 300, currentY, 10); currentY -= 15;
        drawText("SIREN : 933 108 011", 300, currentY, 10); currentY -= 15;

        // Buyer Info
        drawText("Acheteur :", 50, height - 200, 10, boldFont) // Fixed position lower to accommodate variable seller lines
        drawText(buyerName, 50, height - 215, 10)
        drawText(user.email || '', 50, height - 230, 10)

        // Divider
        page.drawLine({ start: { x: 50, y: height - 250 }, end: { x: width - 50, y: height - 250 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })

        // Items
        drawText("Description", 50, height - 270, 10, boldFont)
        drawText("Montant", 450, height - 270, 10, boldFont)

        drawText(fullItemName, 50, height - 300, 10)
        drawText(`${price.toFixed(2)} €`, 450, height - 300, 10)

        // Total
        page.drawLine({ start: { x: 50, y: height - 330 }, end: { x: width - 50, y: height - 330 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
        drawText("TOTAL PAYÉ", 350, height - 360, 12, boldFont)
        drawText(`${price.toFixed(2)} €`, 450, height - 360, 12, boldFont)

        // Footer Legal Notice
        page.drawLine({ start: { x: 50, y: 120 }, end: { x: width - 50, y: 120 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
        drawText("Facture émise au nom et pour le compte de " + partnerName + " par NOWME.", 50, 100, 8, font)
        drawText("NOWME agit en qualité de mandataire de facturation conformément aux dispositions légales.", 50, 88, 8, font)
        drawText("TVA applicable : Celle du Vendeur (Prestataire).", 50, 76, 8, font)

        // Footer Contact Logic
        drawText("Besoin d'aide ?", 50, 50, 8, boldFont)
        drawText("Problème avec la commande : Contactez le prestataire à " + partnerEmail, 50, 38, 8, font)
        drawText("Problème technique : Contactez NOWME à support@nowme.fr", 50, 26, 8, font)


        const pdfBytes = await pdfDoc.save()
        const pdfBase64 = btoa(String.fromCharCode(...pdfBytes))

        // Fetch is_online status from offer (if not already fetched)
        // We already fetched 'offer'. Let's ensure we get 'is_online' and 'digital_product_file' 
        // NOTE: The previous SELECT for offers might need to include these fields.
        // Let's assume we update the SELECT query below first.

        const isOnline = offer.is_online || false;

        // Dynamic Logistics Instructions
        let logisticsHtml = '';

        // Initialize display variables
        let dateDisplay = "Date à définir";
        let locationDisplay = partnerAddress; // Default to Partner Address for physical events

        // Fetch extra fields for "At Home" logic
        const { data: offerDetails } = await supabase
            .from('offers')
            .select('service_zones, event_start_date')
            .eq('id', bookingData.offer_id)
            .single();

        const serviceZones = offerDetails?.service_zones || [];
        const isAtHome = serviceZones.length > 0;

        // Date Priority: Scheduled (Appt) -> Event Start (Fixed)
        const eventDate = bookingData.scheduled_at || offerDetails?.event_start_date;

        // --- STRICT DATE LOGIC ---
        if (eventDate) {
            const dateObj = new Date(eventDate);

            // [FIX] Force Paris Timezone for formatted strings
            const frenchDate = new Intl.DateTimeFormat('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Europe/Paris'
            }).format(dateObj);

            const frenchTime = new Intl.DateTimeFormat('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Paris'
            }).format(dateObj).replace(':', 'h');

            // Combine for display
            dateDisplay = `${frenchDate} à ${frenchTime}`;
        } else if (offer.calendly_url || isAtHome) {
            // It's a booking requiring scheduling, but no date is set yet (First invoice email)
            dateDisplay = "À choisir lors de la prise de RDV";
        }

        // --- STRICT ADDRESS LOGIC ---
        // --- STRICT ADDRESS LOGIC ---
        // [FIX] Prioritize Client Meeting Location if provided (Overrides "At Home" check to handle custom locations/legacy offers)
        console.log("DEBUG ADDRESS LOGIC START");
        console.log("isAtHome config:", isAtHome);
        console.log("bookingData.meeting_location:", bookingData.meeting_location);
        console.log("partnerAddress:", partnerAddress);

        if (bookingData.meeting_location && bookingData.meeting_location.trim().length > 5) {
            locationDisplay = bookingData.meeting_location;
            console.log("DECISION: Used Booking Meeting Location");
        } else if (isAtHome) {
            // Logic: At Home but no address captured?
            locationDisplay = "Adresse à définir / À domicile";
            console.log("DECISION: Used Generic 'At Home' (No input provided)");
        } else {
            // Logic: Not At Home (Standard) = Partner's location.
            locationDisplay = partnerAddress || "Lieu à confirmer par le partenaire";
            console.log("DECISION: Used Partner Address / Default");
        }
        console.log("FINAL LOCATION DISPLAY:", locationDisplay);


        if (isOnline) {
            const bookingType = offer.booking_type || 'event';
            // ... existing online logic ...
            logisticsHtml = `
                    <h3>Accès à votre expérience en ligne</h3>
                    <p>C'est un événement 100% en ligne.</p>
                    <p>Vous retrouverez le lien de connexion dans votre espace "Mes Réservations" ou ci-dessous si disponible.</p>
                    ${offer.calendly_url ? `<p><a href="${offer.calendly_url}">Lien de connexion / Prise de RDV</a></p>` : ''}
                    
                    <p style="margin-top: 20px;">
                        <a href="${Deno.env.get("PUBLIC_SITE_URL")}/mes-reservations" style="background-color: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir ma réservation</a>
                    </p>
                 `;
        } else {
            // Offline / Physical

            logisticsHtml = `
                <h3>Détails du Rendez-vous</h3>
                
                <p style="margin-bottom: 5px;"><strong>📅 Date & Heure :</strong> ${dateDisplay}</p>
                <p style="margin-bottom: 20px;"><strong>📍 Lieu :</strong> ${locationDisplay}</p>

                ${!isAtHome ? `<hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 15px 0;" />` : ''}

                <p>L'équipe <strong>${partnerName}</strong> a hâte de vous accueillir.</p>
                <p>Pensez à présenter ce mail ou votre espace client lors de votre arrivée.</p>
                
                <p style="margin-top: 30px;">
                    <a href="${Deno.env.get("PUBLIC_SITE_URL")}/mes-reservations" style="background-color: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir ma réservation</a>
                </p>
             `;
        }

        // 5. Prepare Email Content
        const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            <h1 style="color: #0F172A;">Félicitations ${user.first_name || ''} ! 🎉</h1>
            <p>Votre réservation pour <strong>${fullItemName}</strong> est bien confirmée.</p>
            <p><strong>Montant payé :</strong> ${price.toFixed(2)} €</p>
            
            <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
            
            ${logisticsHtml}
            
            <p style="margin-top: 40px; font-size: 14px;">
                Vous trouverez votre facture en pièce jointe de ce mail.
            </p>

            <hr style="border: 1px solid #e2e8f0; margin: 30px 0;" />

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #0F172A;">Besoin d'aide ?</h3>
                
                <p style="margin-bottom: 8px;"><strong>🏷️ Problème avec votre commande ?</strong><br/>
                (Annulation, retard, question sur la prestation)<br/>
                Veuillez contacter directement le prestataire : <a href="mailto:${partnerEmail}" style="color: #BE185D;">${partnerEmail}</a></p>
                
                <p style="margin-top: 16px;"><strong>💻 Problème technique ?</strong><br/>
                (Site web, paiement, compte)<br/>
                Contactez l'équipe NOWME : <a href="mailto:support@nowme.fr" style="color: #BE185D;">support@nowme.fr</a></p>
            </div>
        </div>
      `

        // [CRITICAL FIX] Log content for Debugging (Quota Bypass)
        console.log("--- CONTENU DE L'EMAIL (DEBUG) ---")
        console.log(htmlContent)
        console.log("----------------------------------")

        if (!user.email) {
            console.error("❌ No user email found. Cannot send invoice.")
            // Return 200 to stop retries, but log error
            return new Response(JSON.stringify({
                success: false,
                error: "No email address found."
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            })
        }

        // 6. Send Email
        const emailData = await resend.emails.send({
            from: "Nowme <contact@nowme.fr>",
            to: [user.email],
            subject: `Votre réservation confirmée : ${offerTitle}`,
            html: htmlContent,
            attachments: [
                {
                    filename: `Facture-${bookingData.id.slice(0, 8)}.pdf`,
                    content: pdfBase64,
                },
            ],
        })

        console.log("Customer Email API Response:", emailData)

        // 7. Send Partner Notification (if enabled)
        // Default to true if settings are missing (for legacy compatibility) or check specific flag
        const partnerSettings = partner.notification_settings || { new_booking: true }
        const shouldNotifyPartner = partnerSettings.new_booking !== false // Default to true if undefined

        if (shouldNotifyPartner && partner.contact_email) {
            console.log(`📧 Notifying partner (${partner.contact_email}) about new booking...`)

            // Recalculate variables for Partner Context if needed (reuse mostly)
            // Use same date/location logic

            // 1. Send Email to Partner
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
                    
                    <p style="margin-top: 30px;">
                        <a href="${Deno.env.get("PUBLIC_SITE_URL")}/partner/bookings" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Gérer mes réservations</a>
                    </p>
                </div>
            `

            try {
                const partnerEmailData = await resend.emails.send({
                    from: "Nowme <contact@nowme.fr>",
                    to: [partner.contact_email],
                    subject: `Nouvelle réservation : ${buyerName} - ${offerTitle}`,
                    html: partnerHtmlContent,
                })
                console.log("Partner Email API Response:", partnerEmailData)
            } catch (partnerEmailError) {
                console.error("Failed to send partner notification:", partnerEmailError)
                // Don't fail the whole request if partner email fails, just log it
            }

            // 2. Insert In-App Notification (Database)
            try {
                const { error: notificationError } = await supabase
                    .from('partner_notifications')
                    .insert({
                        partner_id: bookingData.partner_id,
                        type: 'new_booking',
                        title: 'Nouvelle réservation !',
                        content: `${buyerName} a réservé ${fullItemName}.`,
                        data: { booking_id: bookingData.id }
                    })

                if (notificationError) {
                    console.error("Failed to create in-app notification:", notificationError)
                } else {
                    console.log("✅ In-app notification created for partner.")
                }
            } catch (err) {
                console.error("Error creating in-app notification:", err)
            }

        } else {
            console.log("Partner notification skipped (disabled or no email).")
        }

        // Handle Resend Errors (checking customer email error primarily)
        if (emailData.error) {
            console.error("Resend API Returned Error:", emailData.error)

            if (emailData.error.statusCode === 429 ||
                (emailData.error.message && emailData.error.message.includes("quota"))) {
                console.warn("⚠️ Email Quota Exceeded. Returning 200 to stop retry loop.")
                // Return 200 OK so Supabase stops retrying this event
                return new Response(JSON.stringify({
                    success: true, // true to satisfy webhook
                    warning: "Email Quota Exceeded",
                    logs: "Invoice generated and logged, email skipped."
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200
                })
            }

            // For other errors, we might want to return 200 as well to avoid loops if we can't fix it by retrying
            return new Response(JSON.stringify({ success: false, error: emailData.error }), { headers: corsHeaders, status: 200 })
        }

        return new Response(JSON.stringify(emailData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error: any) {
        console.error("Error in send-confirmation-email:", error)
        // [CRITICAL] Return 200 even on crash? 
        // Typically 500 triggers retry. If it's a code bug, retrying won't help.
        // But if it's transient, 500 is good.
        // User asked to stop loops. A persistent code bug (like schema error) + 500 = Infinite Loop.
        // So I will return 200 with error details to STOP the loop for now.
        return new Response(JSON.stringify({ error: error.message, status: "Failed but captured" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // Return 200 to stop retries implies "We handled the failure"
        })
    }
})
