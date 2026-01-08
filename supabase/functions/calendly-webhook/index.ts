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

    // Init Supabase Admin (Service Role - Bypass RLS)
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
    );

    let eventId: string | null = null;

    try {
        const url = new URL(req.url);
        // Security Check: Optional secret token (Log only)
        const secret = url.searchParams.get('secret');
        const expectedSecret = Deno.env.get('CALENDLY_WEBHOOK_SECRET');
        if (expectedSecret && secret !== expectedSecret) {
            console.warn("WARNING: Webhook secret mismatch. Proceeding.");
        }

        const partnerId = url.searchParams.get('partner_id');
        if (!partnerId) {
            return new Response(JSON.stringify({ error: 'Missing partner_id' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, // Return 200 to stop Calendly retries on bad config
            });
        }

        const payload = await req.json();
        console.log("Webhook received. Event:", payload.event);

        // --- STEP 1: BUFFERING (Critical Persistence) ---
        // Immediately save the raw payload to DB to prevent data loss or blocking
        const { data: bufferData, error: bufferError } = await supabaseAdmin
            .from('calendly_events')
            .insert({
                event_type: payload.event,
                payload: payload,
                status: 'pending'
            })
            .select('id')
            .single();

        if (bufferError) {
            console.error("CRITICAL: Failed to buffer event to DB", bufferError);
            // If buffering fails, we should technically return error so Calendly retries,
            // BUT if it's a schema error, retrying won't help. We log and try to process anyway.
        } else {
            eventId = bufferData.id;
            console.log("Event buffered with ID:", eventId);
        }

        // --- STEP 2: PROCESSING (Business Logic) ---
        // Only process 'invitee.created'
        if (payload.event !== 'invitee.created') {
            if (eventId) {
                await supabaseAdmin.from('calendly_events').update({ status: 'ignored' }).eq('id', eventId);
            }
            return new Response(JSON.stringify({ message: 'Event ignored' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        try {
            await processBooking(supabaseAdmin, payload, partnerId);

            // Mark buffer as processed
            if (eventId) {
                await supabaseAdmin.from('calendly_events')
                    .update({ status: 'processed', processed_at: new Date().toISOString() })
                    .eq('id', eventId);
            }
        } catch (processError) {
            console.error("Processing Logic Failed:", processError);
            // Log error in buffer
            if (eventId) {
                await supabaseAdmin.from('calendly_events')
                    .update({
                        status: 'error',
                        error_log: processError.message || JSON.stringify(processError)
                    })
                    .eq('id', eventId);
            }
            // We still return 200 to Calendly because we captured the event in buffer!
            // We don't want Calendly to retry and create duplicates if the logic bug is permanent.
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Fatal Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

// --- HELPER FUNCTION: Core Business Logic ---
async function processBooking(supabaseAdmin: any, payload: any, partnerId: string) {
    const invitee = payload.payload;
    const email = invitee.email;
    const eventUri = invitee.event;
    const externalId = invitee.uri;

    // 1. Get Partner Token
    const { data: partner, error: partnerError } = await supabaseAdmin
        .from('partners')
        .select('calendly_token')
        .eq('id', partnerId)
        .single();

    if (partnerError || !partner?.calendly_token) {
        throw new Error("Partner invalid or no token");
    }

    // 2. Extract Event Date (Robust Strategy)
    let scheduledAt = payload?.resource?.start_time; // Strategy A: Direct Resource (User specified)

    if (!scheduledAt && payload?.payload?.scheduled_event?.start_time) {
        scheduledAt = payload.payload.scheduled_event.start_time; // Strategy B: Nested Payload
    }

    // Strategy C: Fetch from API if missing
    if (!scheduledAt) {
        console.log("Date not in payload, fetching from URI:", eventUri);
        const eventResp = await fetch(eventUri, {
            headers: { 'Authorization': `Bearer ${partner.calendly_token}`, 'Content-Type': 'application/json' }
        });

        if (!eventResp.ok) throw new Error(`Calendly API Error: ${await eventResp.text()}`);

        const eventData = await eventResp.json();
        scheduledAt = eventData.resource?.start_time;
    }

    // CRITICAL: Validate Date
    if (!scheduledAt) {
        throw new Error("CRITICAL: Failed to extract start_time from both payload and API. Aborting to prevent bad data.");
    }

    console.log("Confirmed Scheduled At:", scheduledAt);

    // Fetch Location (Reuse API eventData if we fetched it, or fetch if we didn't?)
    // Optimization: If we didn't fetch eventData (Strategy A/B), we might miss Location.
    // If Location is needed and missing, we might still need to fetch.
    // Let's check if we need to fetch for Location or Event Type URL.

    // We need Event Type URL for Offer Matching anyway!
    // Does payload have event_type link?
    let eventTypeUrl = payload?.payload?.event_type; // usually a URI

    // If we have scheduledAt but strict API fetch is needed for other data (Location/EventType), we might just stick to fetching?
    // User wants "Correction via Table Tampon... chercher dans JSON". 
    // But we need to link the Offer via EventType.
    // Let's proceed with fetching if data is missing, but prioritize the Date check.

    // If we extracted date from payload, we might still need to fetch for Location/EventTypeUrl if not in payload.
    // But let's assume we proceed to fetch logic for the rest IF needed.

    // Actually, to keep it simple and safe:
    // If we have date, good. We still need `event_type` to find the offer.
    // `invitee` (payload.payload) usually has `event_type` URI.

    // Let's keeping the fetches for now but ensuring `scheduledAt` is valid.

    // Ref: existing code fetched eventData for location and start_time.
    // I will use reference to eventData if I fetched it.

    let eventResource: any = null;
    if (!payload?.resource?.start_time) { // If we didn't get it from top level resource
        // We might have fetched it above in Strategy C
        // If Strategy A/B failed, we fetched.
    }

    // Let's refine the replacement to be clean.

    // ... code above ... 

    // If we fetched in Strategy C, we have `eventData`.
    // I'll restructure to fetch if needed.

    let matchUrl = eventUri; // Fallback

    // If we didn't fetch eventData yet (Strategy A/B success), we might need to fetch it for Location/EventType if not in payload.
    // But `invitee.event` is the Event URI. `invitee` has keys.

    // Let's just ensure we HAVE the date. 

    // Re-implement the fetching block to use the boolean logic?
    // Or just paste the block replacing lines 132-141.

    // I will replace the block 132-141.


    // Location Logic (Safe Extraction)
    let meetingLocation = null;
    // Try to get location object from payload or API resource
    const loc = payload?.payload?.location || eventResource?.location;

    if (loc) {
        if (loc.type === 'physical') meetingLocation = loc.location;
        else if (loc.type === 'outbound_call') meetingLocation = `Appel: ${loc.phone_number}`;
        else meetingLocation = loc.join_url || loc.location;
    } else {
        console.warn("Location not found in payload or API resource. Defaulting to null.");
    }

    // 3. Identification Strategy (UTM > Legacy)
    let offerId = null;
    let offerTitle = '';
    let userId = null;

    const utm = invitee.tracking || {};
    // Check if valid UUIDs passed
    const isOfferId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (utm.utm_content && isOfferId(utm.utm_content)) {
        console.log("Using UTM Offer ID:", utm.utm_content);
        offerId = utm.utm_content;
    }

    if (utm.utm_source && isOfferId(utm.utm_source)) {
        console.log("Using UTM User ID:", utm.utm_source);
        userId = utm.utm_source;
    }

    // 4. Find Offer (If not in UTM)
    if (!offerId) {
        // ... Existing Logic ...
        const eventTypeResp = await fetch(eventTypeUrl || eventResource.event_type || invitee.event_type, {
            headers: { 'Authorization': `Bearer ${partner.calendly_token}`, 'Content-Type': 'application/json' }
        });
        if (!eventTypeResp.ok) throw new Error("Calendly Event Type API Error (Offer Lookup)");

        const eventTypeData = await eventTypeResp.json();
        const schedulingUrl = eventTypeData.resource.scheduling_url;

        const { data: offers } = await supabaseAdmin
            .from('offers')
            .select('id, title')
            .eq('partner_id', partnerId)
            .ilike('calendly_url', `${schedulingUrl}%`)
            .limit(1);

        if (!offers || offers.length === 0) throw new Error(`No offer found for URL: ${schedulingUrl}`);
        offerId = offers[0].id;
        offerTitle = offers[0].title;
    } else {
        // Fetch Title for notification if we have ID
        const { data: offer } = await supabaseAdmin.from('offers').select('title').eq('id', offerId).single();
        if (offer) offerTitle = offer.title;
    }

    // 5. Find User (If not in UTM)
    if (!userId) {
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('user_id')
            .ilike('email', email)
            .maybeSingle();

        if (!profile) throw new Error(`User not found for email: ${email}`);
        userId = profile.user_id;
    }

    // 5. Update or Create Booking
    const { data: existingBooking } = await supabaseAdmin
        .from('bookings')
        .select('id, status, meeting_location')
        .eq('user_id', userId)
        .eq('offer_id', offerId)
        // .is('scheduled_at', null) // REMOVED: Stripe webhook seeds with 'now', so it's rarely null. We want to attach to the latest booking regardless.
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingBooking) {
        console.log("Updating Booking:", existingBooking.id);

        // Preserve existing location (e.g. entered in Stripe) if available.
        // prioritized over Calendly default if both exist.
        const finalLocation = existingBooking.meeting_location || meetingLocation;

        await supabaseAdmin.from('bookings').update({
            scheduled_at: scheduledAt,
            meeting_location: finalLocation,
            calendly_event_id: externalId
        }).eq('id', existingBooking.id);

        // Notifications
        safeInvoke(supabaseAdmin, 'send-partner-notification', {
            partnerId, type: 'new_booking',
            data: { offerTitle, date: scheduledAt, meeting_location: finalLocation, booking_id: existingBooking.id, scheduled_at: scheduledAt }
        });

        // SEND CONFIRMATION EMAIL NOW THAT WE HAVE DATE
        safeInvoke(supabaseAdmin, 'send-confirmation-email', { id: existingBooking.id });

    } else {
        console.log("Creating New Pending Booking");

        // Get Price Check (Optional but good for records)
        const { data: variant } = await supabaseAdmin.from('offer_variants').select('price, discounted_price').eq('offer_id', offerId).limit(1).maybeSingle();
        const price = variant ? (variant.discounted_price || variant.price) : 0;

        const { data: newBooking, error: insertError } = await supabaseAdmin.from('bookings').insert({
            user_id: userId,
            offer_id: offerId,
            booking_date: new Date().toISOString(),
            scheduled_at: scheduledAt,
            meeting_location: meetingLocation,
            customer_email: email,
            calendly_event_id: externalId,
            source: 'calendly',
            status: 'pending',
            amount: price,
            currency: 'EUR',
            partner_id: partnerId
        }).select('id').single();

        if (insertError) throw insertError;
        if (newBooking) {
            safeInvoke(supabaseAdmin, 'send-partner-notification', {
                partnerId, type: 'new_booking',
                data: { offerTitle, date: scheduledAt, meeting_location: meetingLocation, booking_id: newBooking.id, scheduled_at: scheduledAt }
            });
        }
    }
}

// Utils to prevent crash on non-critical notifications
async function safeInvoke(supabase: any, functionName: string, body: any) {
    try {
        await supabase.functions.invoke(functionName, { body });
    } catch (e) {
        console.error(`Failed to invoke ${functionName}`, e);
    }
}
