
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Stripe } from "https://esm.sh/stripe@12.0.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancellationRequest {
    bookingId: string;
}

serve(async (req: Request) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("Cancel Booking Function Invoked");

        // Environment checks
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        const resendKey = Deno.env.get('RESEND_API_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");
        if (!resendKey) throw new Error("Missing RESEND_API_KEY");
        if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

        // Initialize Stripe & Resend
        const stripe = new Stripe(stripeKey, {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        });
        const resend = new Resend(resendKey);

        // 1. Auth Check
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            throw new Error("Missing Authorization Header");
        }

        const token = authHeader.replace('Bearer ', '');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Explicitly pass token to getUser
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth Error:", authError);
            throw new Error(`Unauthorized: ${authError?.message || 'No user found'}`);
        }

        // 2. Parse Request
        const { bookingId }: CancellationRequest = await req.json();

        if (!bookingId) {
            throw new Error('Booking ID is required');
        }

        // 3. Fetch Booking & Offer Details
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .select(`
        *,
        offers (
          title,
          cancellation_policy,
          booking_type,
          event_start_date,
          partner_id,
          partners (
            contact_email,
            business_name
          )
        ),
        payment_intent_id
      `)
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            console.error("Booking Fetch Error:", bookingError);
            throw new Error('Booking not found or access denied');
        }

        if (booking.user_id !== user.id) {
            throw new Error("Unauthorized: Booking belongs to another user");
        }

        if (booking.status === 'cancelled') {
            throw new Error('Booking is already cancelled');
        }

        const offer = booking.offers;

        if (!offer) {
            throw new Error("Booking has no associated offer");
        }

        const partner = offer.partners;
        const bookingType = offer.booking_type || 'event';
        // Force 'non_refundable' logic for simple purchases (digital goods)
        const policy = bookingType === 'purchase' ? 'non_refundable' : (offer.cancellation_policy || 'flexible');

        // [CRITICAL FIX] USE SCHEDULED_AT for Reference Date
        // Priority: Scheduled Date (Appointment) -> Event Start (Fixed Event) -> Booking Date (Purchase/Fallback)
        const referenceDateString = booking.scheduled_at || offer.event_start_date || booking.booking_date;
        const referenceDate = new Date(referenceDateString);

        const now = new Date();

        // 4. Determine Refund Eligibility
        let refundEligible = false;
        const hoursUntilEvent = (referenceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const daysUntilEvent = hoursUntilEvent / 24;

        console.log(`Debug Date Logic:
            Scheduled: ${booking.scheduled_at}
            EventStart: ${offer.event_start_date}
            BookingDate: ${booking.booking_date}
            Active Reference: ${referenceDateString}
            Hours Until: ${hoursUntilEvent.toFixed(2)}
            Policy: ${policy}
        `);

        switch (policy) {
            case 'flexible': // 24h
                if (hoursUntilEvent >= 24) refundEligible = true;
                break;
            case 'moderate': // 7 days
                if (daysUntilEvent >= 7) refundEligible = true;
                break;
            case 'strict': // 15 days
                if (daysUntilEvent >= 15) refundEligible = true;
                break;
            case 'non_refundable':
                refundEligible = false;
                break;
            default:
                refundEligible = false;
        }

        // 5. Process Refund (if eligible and paid)
        let refundId = null;
        let refundAmountFormatted = "0,00 €";

        if (refundEligible && booking.payment_intent_id && booking.payment_intent_id.startsWith('pi_')) {
            try {
                const refund = await stripe.refunds.create({
                    payment_intent: booking.payment_intent_id,
                    reason: 'requested_by_customer',
                    metadata: { booking_id: bookingId, policy: policy }
                });
                refundId = refund.id;
                // Assuming booking didn't have amount stored cleanly, we'd need to fetch PI to know exact amount 
                // but for now, let's say "Intégral" if full refund. 
                // Ideally we should know the amount.
                refundAmountFormatted = "Intégral";
            } catch (stripeError) {
                console.error('Stripe refund error:', stripeError);
                // Proceed with cancellation but log error. Maybe notify admin?
            }
        }

        // 6. Update Booking Status
        const reason = `User requested cancellation. Policy: ${policy}. Refund: ${refundEligible ? 'Yes' : 'No'}`;
        const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({
                status: 'cancelled',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString()
            })
            .eq('id', bookingId);

        if (updateError) throw updateError;

        // Fetch full profile for email names
        const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Fetch Admin User to be absolutely sure about email/phone
        const { data: { user: adminUser }, error: adminUserError } = await supabaseAdmin.auth.admin.getUserById(user.id);

        const finalEmail = adminUser?.email || user.email || booking.customer_email;
        const finalPhone = adminUser?.phone || user.phone;

        console.log(`Resolved User Info - Email: ${finalEmail}, Phone: ${finalPhone}`);

        const userName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : (finalEmail || 'Client invalide');

        if (booking.variant_id) {
            const { error: stockError } = await supabaseAdmin.rpc('increment_variant_stock', {
                variant_id_input: booking.variant_id
            });
            if (stockError) console.error("Error restoring stock:", stockError);
            else console.log("Stock restored for variant:", booking.variant_id);
        }

        // 7c. Revert Loyalty Points (if refund eligible)
        // We use award_points with negative value to decrement both balance and lifetime points
        if (refundEligible && booking.amount > 0) {
            const pointsToRevert = Math.floor(booking.amount);
            console.log(`[LOYALTY] Reverting ${pointsToRevert} points for User ${user.id}`);

            const { error: revError } = await supabaseAdmin.rpc('award_points', {
                p_user_id: user.id,
                p_amount: -pointsToRevert,
                p_reason: `Annulation: ${offer.title}`,
                p_metadata: { booking_id: bookingId, refund: true }
            });

            if (revError) {
                console.warn("[LOYALTY] Failed to revert points (balance likely too low):", revError.message);
                // We proceed without blocking cancellation
            } else {
                console.log("[LOYALTY] Points reverted successfully.");
            }
        }

        // 7b. Sync with Calendly (if applicable)
        if (booking.source === 'calendly' && booking.calendly_event_id) {
            console.log("Attempting to cancel Calendly event:", booking.calendly_event_id);
            try {
                // 1. Get Partner Token
                const { data: partnerData, error: partnerError } = await supabaseAdmin
                    .from('partners')
                    .select('calendly_token')
                    .eq('id', offer.partner_id)
                    .single();

                if (partnerError || !partnerData?.calendly_token) {
                    console.warn("Could not cancel Calendly event: Partner token missing");
                } else {
                    // 2. Extract Event UUID from Invitee URI
                    // URI format: https://api.calendly.com/scheduled_events/{event_uuid}/invitees/{invitee_uuid}
                    const uriParts = booking.calendly_event_id.split('/scheduled_events/');
                    if (uriParts.length > 1) {
                        const eventUuid = uriParts[1].split('/')[0];
                        console.log("Extracted Event UUID:", eventUuid);

                        // 3. Call Calendly API
                        const cancelResp = await fetch(`https://api.calendly.com/scheduled_events/${eventUuid}/cancellation`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${partnerData.calendly_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                reason: `Cancelled by user via Nowme: ${policy} policy.`
                            })
                        });

                        if (!cancelResp.ok) {
                            const errText = await cancelResp.text();
                            console.error("Calendly API Error:", errText);
                        } else {
                            console.log("✅ Calendly event cancelled successfully.");
                        }
                    } else {
                        console.warn("Could not parse Calendly Event UUID from:", booking.calendly_event_id);
                    }
                }
            } catch (calError) {
                console.error("Error during Calendly sync:", calError);
            }
        }

        // 8. Send Emails via Resend
        // [CRITICAL FIX] Use Same Priority for Email Date
        const eventDateString = booking.scheduled_at || offer.event_start_date || booking.booking_date;
        const eventDate = new Date(eventDateString);

        const dateFormatted = eventDate.toLocaleDateString('fr-FR', {
            timeZone: 'Europe/Paris',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeFormatted = eventDate.toLocaleTimeString('fr-FR', {
            timeZone: 'Europe/Paris',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Show time only if it's an appointment (scheduled_at) or event
        const dateDisplay = (booking.scheduled_at || offer.event_start_date)
            ? `${dateFormatted} à ${timeFormatted}`
            : dateFormatted;

        let customerEmailSent = false;
        let partnerEmailSent = false;
        let emailErrorDetail = null;

        // A. Email to Customer
        if (finalEmail) {
            try {
                console.log(`Attempting to send email to customer: ${finalEmail}`);

                // Translate policy and create specific refund message
                const policyDetails = ({
                    'flexible': 'Flexible (Annulable sans frais jusqu\'à 15 jours avant le Kiff)',
                    'moderate': 'Modérée (Annulable sans frais jusqu\'à 7 jours avant le Kiff)',
                    'strict': 'Stricte (Annulable sans frais jusqu\'à 24h avant le Kiff)',
                    'non_refundable': 'Non remboursable (Pas de remboursement possible)'
                } as Record<string, string>)[policy] || policy;

                const refundMessage = refundEligible
                    ? `<p style="color: #27ae60; font-weight: bold;">✅ Tout est bon, vous serez remboursée (remboursement intégral initié sur votre moyen de paiement).</p>`
                    : `<div style="background-color: #fceceb; padding: 15px; border-radius: 8px; margin-top: 20px;">
                         <p style="color: #c0392b; font-weight: bold;">Nous sommes sincèrement désolées, mais nous ne pourrons pas vous rembourser cette fois-ci. ❤️</p>
                         <p style="font-size: 0.95em;">Pour que le Club Nowme puisse continuer à exister et soutenir nos super partenaires, nous devons nous en tenir aux règles d'annulation choisies lors de la réservation.</p>
                         <p style="font-size: 0.9em; margin-top: 15px; border-top: 1px solid #eebbba; padding-top: 10px;">
                           <em>Un cas de force majeure (Hospitalisation, Décès d'un proche, Accident grave...) ?</em><br/>
                           <a href="mailto:contact@nowme.fr?subject=Réclamation Annulation ${bookingId}" style="color: #c0392b; text-decoration: underline;">Faire une réclamation</a>
                         </p>
                       </div>`;

                // Action Date (Cancellation Time)
                const actionDateDisplay = new Date().toLocaleDateString('fr-FR', {
                    timeZone: 'Europe/Paris',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                const data = await resend.emails.send({
                    from: 'Nowme <noreply@nowme.fr>',
                    to: [finalEmail],
                    subject: 'Confirmation d\'annulation de réservation - Nowme',
                    html: `
            <div style="font-family: sans-serif; color: #333;">
                <h1 style="color: #E25E3E;">Annulation confirmée</h1>
                <p>Bonjour ${userName},</p>
                <p>Votre Kiff était le <strong>${offer.title}</strong> (prévu le ${dateDisplay}).<br/>
                Vous avez annulé le ${actionDateDisplay}.</p>

                <p><strong>Politique appliquée :</strong> ${policyDetails}</p>

                ${refundMessage}

                <div style="margin-top: 30px; text-align: center;">
                    <p>Ce n'est que partie remise ! Découvrez d'autres expériences :</p>
                    <a href="https://club.nowme.fr/tous-les-kiffs" style="background-color: #E25E3E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Découvrir d'autres Kiffs</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 0.9em; color: #888;">À bientôt sur Nowme !</p>
              </div>
            `
                });
                console.log("Customer email response:", data);
                if (data.error) {
                    console.error("Resend API returned error for customer:", data.error);
                    emailErrorDetail = data.error;
                } else {
                    customerEmailSent = true;
                }
            } catch (emailError) {
                console.error('Error sending customer email:', emailError);
                emailErrorDetail = emailError;
            }
        } else {
            console.warn("No valid email found for customer, skipping email.");
        }

        // B. Email to Partner
        if (partner?.contact_email) {
            try {
                console.log(`Attempting to send email to partner: ${partner.contact_email}`);
                const emailDisplay = finalEmail ? `(${finalEmail})` : (finalPhone ? `(Tél: ${finalPhone})` : '(Contact inconnu)');

                const data = await resend.emails.send({
                    from: 'Nowme <noreply@nowme.fr>',
                    to: [partner.contact_email],
                    subject: 'Annulation de réservation - Nowme',
                    html: `
            <div style="font-family: sans-serif; color: #333;">
              <h1 style="color: #E25E3E;">Réservation Annulée</h1>
              <p>Le client <strong>${userName}</strong> ${emailDisplay} a annulé sa réservation pour :</p>
              <ul>
                <li><strong>Offre :</strong> ${offer.title}</li>
                <li><strong>Date :</strong> ${dateFormatted}</li>
              </ul>
              <p>⚡ La place a été remise en stock et est de nouveau disponible pour d'autres clients.</p>
            </div>
          `
                });
                console.log("Partner email response:", data);
                if (data.error) {
                    console.error("Resend API returned error for partner:", data.error);
                } else {
                    partnerEmailSent = true;
                }
            } catch (emailError) {
                console.error('Error sending partner email:', emailError);
            }
        } else {
            console.warn("Partner has no contact email, skipping notification.");
        }

        console.log(`Booking ${bookingId} cancelled. Refunded: ${refundEligible}. Emails: Customer=${customerEmailSent}, Partner=${partnerEmailSent}`);

        return new Response(
            JSON.stringify({ success: true, refundEligible, refundId, customerEmailSent, partnerEmailSent, emailError: emailErrorDetail }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error:', error);
        // Return 200 so client can see the error message in 'data.error'
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
