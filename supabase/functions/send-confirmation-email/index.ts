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
            supabase.from('offers').select('title').eq('id', bookingData.offer_id).single(),
            supabase.from('partners').select('business_name, description, website, address').eq('id', bookingData.partner_id).single(),
            bookingData.variant_id ? supabase.from('offer_variants').select('name, price').eq('id', bookingData.variant_id).single() : Promise.resolve({ data: null, error: null })
        ])

        if (userResponse.error) console.error("User fetch error:", userResponse.error)

        let user = userResponse.data || { first_name: '', last_name: '', email: '' }
        const offer = offerResponse.data || { title: 'Offre inconnue' }
        const partner = partnerResponse.data || { business_name: 'Partenaire', address: '' }
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
        drawText(`NOWME`, 50, height - 80, 15, boldFont)
        drawText(`Date: ${new Date(bookingData.booking_date).toLocaleDateString('fr-FR')}`, 400, height - 50, 10)
        drawText(`Facture #: ${bookingData.id.slice(0, 8).toUpperCase()}`, 400, height - 65, 10)

        // Seller Info
        drawText("Vendeur :", 50, height - 120, 10, boldFont)
        drawText(partnerName, 50, height - 135, 10)
        if (partnerAddress) {
            drawText(partnerAddress, 50, height - 150, 10)
        }

        // Buyer Info
        drawText("Acheteur :", 300, height - 120, 10, boldFont)
        drawText(buyerName, 300, height - 135, 10)
        drawText(user.email || '', 300, height - 150, 10)

        // Divider
        page.drawLine({ start: { x: 50, y: height - 180 }, end: { x: width - 50, y: height - 180 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })

        // Items
        drawText("Description", 50, height - 200, 10, boldFont)
        drawText("Montant", 450, height - 200, 10, boldFont)

        drawText(fullItemName, 50, height - 230, 10)
        drawText(`${price.toFixed(2)} €`, 450, height - 230, 10)

        // Total
        page.drawLine({ start: { x: 50, y: height - 260 }, end: { x: width - 50, y: height - 260 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
        drawText("TOTAL PAYÉ", 350, height - 290, 12, boldFont)
        drawText(`${price.toFixed(2)} €`, 450, height - 290, 12, boldFont)

        // Footer
        drawText("Merci pour votre confiance !", 50, 100, 10, font)
        drawText("Généré par Nowme.io", 50, 80, 8, font)

        const pdfBytes = await pdfDoc.save()
        const pdfBase64 = btoa(String.fromCharCode(...pdfBytes))

        // 5. Prepare Email Content
        const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0F172A;">Félicitations ${user.first_name || ''} ! 🎉</h1>
            <p>Votre réservation pour <strong>${fullItemName}</strong> est bien confirmée.</p>
            <p><strong>Montant payé :</strong> ${price.toFixed(2)} €</p>
            
            <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
            
            <h3>Détails Logistiques</h3>
            <p>L'équipe <strong>${partnerName}</strong> a hâte de vous accueillir.</p>
            <p>Pensez à présenter ce mail ou votre espace client lors de votre arrivée.</p>
            
            <p style="margin-top: 30px;">
                <a href="${Deno.env.get("PUBLIC_SITE_URL")}/mes-reservations" style="background-color: #0F172A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Voir ma réservation</a>
            </p>
            
            <p style="margin-top: 40px; font-size: 12px; color: #64748b;">
                Vous trouverez votre facture en pièce jointe de ce mail.
            </p>
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
            from: "Nowme <contact@nowme.io>",
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

        console.log("Email API Response:", emailData)

        // Handle Resend Errors
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
