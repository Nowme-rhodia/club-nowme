import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

        // 1. Fetch eligible bookings
        // We look for confirmed bookings where feedback email hasn't been sent.
        // We join with offers and partners to get necessary details.
        const { data: bookings, error: fetchError } = await supabase
            .from('bookings')
            .select(`
                id,
                booking_date,
                created_at,
                user_id,
                status,
                feedback_email_sent_at,
                offers (
                    id,
                    title,
                    booking_type,
                    duration,
                    event_end_date
                ),
                partners!inner (
                   business_name
                )
            `)
            .in('status', ['confirmed', 'paid'])
            .is('feedback_email_sent_at', null)
            // Limit to prevent timeouts, run frequently
            .limit(50)

        if (fetchError) {
            console.error("Error fetching bookings:", fetchError)
            throw fetchError
        }

        console.log(`Checking ${bookings?.length || 0} potential bookings for feedback...`)

        const now = new Date()
        const emailsToSend = []

        for (const booking of bookings || []) {
            // @ts-ignore
            const offer = booking.offers
            // @ts-ignore
            const partner = booking.partners

            let shouldSend = false
            let triggerTime: Date | null = null

            // LOGIC
            // 1. Calendly / Event
            if (offer.booking_type === 'calendly' || offer.booking_type === 'event') {
                // Priority: event_end_date > booking_date + duration > booking_date + 60m
                let endTime: Date

                if (offer.event_end_date) {
                    endTime = new Date(offer.event_end_date)
                } else {
                    const durationMinutes = offer.duration || 60
                    const bookingDate = new Date(booking.booking_date)
                    endTime = new Date(bookingDate.getTime() + durationMinutes * 60000)
                }

                // Trigger 2 hours after end
                triggerTime = new Date(endTime.getTime() + 2 * 60 * 60000)

                if (now >= triggerTime) {
                    shouldSend = true
                }
            }
            // 2. Promo / Purchase (Undated or Code)
            else if (offer.booking_type === 'promo' || offer.booking_type === 'purchase') {
                // Trigger 2 months after booking/click (using booking_date or created_at)
                const interactionDate = new Date(booking.booking_date || booking.created_at)
                // Add 2 months
                triggerTime = new Date(interactionDate)
                triggerTime.setMonth(triggerTime.getMonth() + 2)

                if (now >= triggerTime) {
                    shouldSend = true
                }
            }

            if (shouldSend) {
                emailsToSend.push({ booking, offer, partner })
            }
        }

        console.log(`Found ${emailsToSend.length} emails to send.`)

        const results = []

        // Process Sends
        for (const item of emailsToSend) {
            const { booking, offer, partner } = item

            // Fetch User Email
            const { data: userProfile, error: userError } = await supabase
                .from('user_profiles')
                .select('email, first_name')
                .eq('user_id', booking.user_id)
                .single()

            let email = userProfile?.email
            if (!email) {
                // Fallback to Auth Admin if missing in profile
                const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id)
                email = authUser?.user?.email
            }

            if (!email) {
                console.error(`No email found for user ${booking.user_id}, skipping.`)
                continue
            }

            const partnerName = partner?.business_name || 'notre partenaire'
            const firstName = userProfile?.first_name || 'Cher membre'

            // Email Content
            const htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
                    <h2 style="color: #0F172A;">Alors, ce moment ? ✨</h2>
                    <p>Bonjour ${firstName},</p>
                    
                    <p>Il y a quelque temps, vous avez profité d'une expérience chez <strong>${partnerName}</strong> (${offer.title}).</p>
                    
                    <p>On adorerait savoir comment cela s'est passé ! Votre avis est précieux pour nous et pour aider les autres membres à choisir leurs futurs kiffs.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${Deno.env.get("PUBLIC_SITE_URL")}/mes-reservations" style="background-color: #BE185D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Noter mon expérience
                        </a>
                    </div>

                    <hr style="border: 1px solid #e2e8f0; margin: 30px 0;" />

                    <h3 style="color: #0F172A; text-align: center;">Envie d'un nouveau Kiff ? 🌟</h3>
                    <p style="text-align: center;">La vie est faite de petits plaisirs. Pourquoi ne pas en découvrir un autre dès maintenant ?</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px;">
                        <p style="margin-bottom: 20px;">Massages, ateliers, sorties... Découvrez nos dernières pépites !</p>
                        <a href="${Deno.env.get("PUBLIC_SITE_URL")}/categories" style="background-color: #0F172A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">
                            Explorer les offres
                        </a>
                    </div>
                    
                    <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center;">
                        L'équipe Nowme<br/>
                        <a href="${Deno.env.get("PUBLIC_SITE_URL")}" style="color: #94a3b8;">club.nowme.fr</a>
                    </p>
                </div>
             `

            // Send Email
            try {
                // Add delay to respect Resend Rate Limit (2 req/sec)
                if (results.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }

                const { error } = await resend.emails.send({
                    from: "Nowme <contact@nowme.fr>",
                    to: [email],
                    subject: `Votre expérience chez ${partnerName}`,
                    html: htmlContent,
                })

                if (error) throw error

                // Update DB
                await supabase
                    .from('bookings')
                    .update({ feedback_email_sent_at: new Date().toISOString() })
                    .eq('id', booking.id)

                results.push({ id: booking.id, status: 'sent', email })
                console.log(`✅ Email sent to ${email} for booking ${booking.id}`)

            } catch (err) {
                console.error(`Failed to send email to ${email}:`, err)
                results.push({ id: booking.id, status: 'failed', error: err })
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        console.error("Error in send-feedback-email:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})
