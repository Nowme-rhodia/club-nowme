import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const partnerId = url.searchParams.get('partner_id');

        if (!partnerId) {
            console.warn("Missing partner_id in webhook URL");
            // On retourne 200 pour que Calendly ne retente pas à l'infini si c'est une erreur de config
            return new Response(JSON.stringify({ error: 'Missing partner_id' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const payload = await req.json();
        console.log("Webhook received for partner:", partnerId, "Event:", payload.event);

        // On ne traite que 'invitee.created'
        if (payload.event !== 'invitee.created') {
            return new Response(JSON.stringify({ message: 'Event ignored' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const invitee = payload.payload;
        const email = invitee.email;

        const eventUri = invitee.event; // "https://api.calendly.com/scheduled_events/..."
        const calendlyEventId = invitee.uri;
        const externalId = invitee.uri;

        // Init Supabase Admin
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Récupérer le token du partenaire
        const { data: partner, error: partnerError } = await supabaseAdmin
            .from('partners')
            .select('calendly_token, id')
            .eq('id', partnerId)
            .single();

        if (partnerError || !partner || !partner.calendly_token) {
            console.error("Partner not found or no token", partnerError);
            return new Response(JSON.stringify({ error: 'Partner invalid' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 2. Fetch Event Details FIRST (to get event_type URI and Start Time)
        if (!eventUri) {
            console.error("Missing event URI in payload");
            return new Response(JSON.stringify({ error: 'Missing event URI' }), { status: 200, headers: corsHeaders });
        }

        const eventResp = await fetch(eventUri, {
            headers: {
                'Authorization': `Bearer ${partner.calendly_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!eventResp.ok) {
            console.error("Failed to fetch event from Calendly", await eventResp.text());
            return new Response(JSON.stringify({ error: 'Calendly Event API error' }), { status: 200, headers: corsHeaders });
        }

        const eventData = await eventResp.json();
        const eventResource = eventData.resource;
        const eventTypeUri = eventResource.event_type; // Correctly get event_type URI
        const scheduledAt = eventResource.start_time;

        // Extract Location
        let meetingLocation = null;
        const loc = eventResource.location;
        if (loc) {
            if (loc.type === 'physical') {
                meetingLocation = loc.location;
            } else if (loc.type === 'outbound_call') {
                meetingLocation = `Appel vers : ${loc.phone_number || 'Numéro client'}`;
            } else if (loc.join_url) {
                meetingLocation = loc.join_url;
            } else if (loc.location) {
                meetingLocation = loc.location;
            }
        }

        console.log("Event Details Fetched. Type URI:", eventTypeUri);

        // 3. Fetch Event Type details to find the Scheduling URL (Slug)
        const calendlyResp = await fetch(eventTypeUri, {
            headers: {
                'Authorization': `Bearer ${partner.calendly_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!calendlyResp.ok) {
            console.error("Failed to fetch event type from Calendly", await calendlyResp.text());
            return new Response(JSON.stringify({ error: 'Calendly Event Type API error' }), { status: 200, headers: corsHeaders });
        }

        const eventTypeData = await calendlyResp.json();
        const eventType = eventTypeData.resource;
        const schedulingUrl = eventType.scheduling_url;

        console.log("Scheduling URL found:", schedulingUrl);

        // 3. Find the Offer in DB
        const { data: offers, error: offerError } = await supabaseAdmin
            .from('offers')
            .select('id, title')
            .eq('partner_id', partnerId)
            .ilike('calendly_url', `${schedulingUrl}%`);

        if (offerError) console.error("Error searching offer", offerError);

        let offerId = null;
        if (offers && offers.length > 0) {
            offerId = offers[0].id;
            console.log("Offer found:", offers[0].title);
        } else {
            console.warn("No offer found matching Calendly URL:", schedulingUrl);
        }

        if (!offerId) {
            console.error("Cannot proceed without offer_id");
            return new Response(JSON.stringify({ error: 'Offer not found' }), { status: 200, headers: corsHeaders });
        }

        // 4. Find User by Email
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('user_id')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            console.warn("User not found for email:", email);
            return new Response(JSON.stringify({ error: 'User not found' }), { status: 200, headers: corsHeaders });
        }

        // 5. Check for Existing Booking
        const { data: existingBooking, error: searchError } = await supabaseAdmin
            .from('bookings')
            .select('id, status')
            .eq('user_id', profile.user_id)
            .eq('offer_id', offerId)
            .is('scheduled_at', null)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existingBooking) {
            console.log("Updating existing booking:", existingBooking.id);
            const { error: updateError } = await supabaseAdmin
                .from('bookings')
                .update({
                    scheduled_at: scheduledAt,
                    meeting_location: meetingLocation,
                    calendly_event_id: externalId
                    // updated_at removed to bypass stale schema cache error
                })
                .eq('id', existingBooking.id);

            if (updateError) {
                console.error("Error updating booking", updateError);
                return new Response(JSON.stringify({ error: 'Update Failed' }), { status: 500, headers: corsHeaders });
            }

            // Trigger Partner Notification with fresh Date/Location
            try {
                console.log("Triggering Partner Notification for updated booking...");
                supabaseAdmin.functions.invoke('send-partner-notification', {
                    body: {
                        partnerId: partnerId,
                        type: 'new_booking',
                        data: {
                            offerTitle: offers[0].title, // We have offers array from search
                            date: scheduledAt,
                            meeting_location: meetingLocation || existingBooking.meeting_location, // Use new or existing
                            booking_id: existingBooking.id,
                            scheduled_at: scheduledAt // Explicit
                        }
                    }
                });
            } catch (notifErr) {
                console.error("Failed to trigger partner notification:", notifErr);
            }

            // Trigger Client Confirmation Email (Update with Date)
            try {
                console.log("Triggering Client Confirmation Email (Update)...");
                supabaseAdmin.functions.invoke('send-confirmation-email', {
                    body: { id: existingBooking.id }
                });
            } catch (emailErr) {
                console.error("Failed to trigger client email:", emailErr);
            }
        } else {
            console.log("No existing paid booking found. Creating new PENDING booking (Schedule-then-Pay flow).");

            // Fetch price details as fallback
            const { data: variantData } = await supabaseAdmin
                .from('offer_variants')
                .select('price, discounted_price')
                .eq('offer_id', offerId)
                .limit(1)
                .single();
            const estimatedAmount = variantData ? (variantData.discounted_price || variantData.price) : 0;

            const { error: insertError } = await supabaseAdmin
                .from('bookings')
                .insert({
                    user_id: profile.user_id,
                    offer_id: offerId,
                    booking_date: new Date().toISOString(), // Action date
                    scheduled_at: scheduledAt, // Event date
                    meeting_location: meetingLocation,
                    customer_email: email,
                    calendly_event_id: externalId,
                    external_id: externalId,
                    source: 'calendly',
                    status: 'pending', // Mark as pending payment
                    amount: estimatedAmount,
                    currency: 'EUR',
                    partner_id: partnerId
                });

            if (insertError) {
                console.error("Error inserting pending booking", insertError);
                return new Response(JSON.stringify({ error: 'Insert Failed' }), { status: 500, headers: corsHeaders });
            }
        }

        console.log("Webhook processed successfully!");
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
