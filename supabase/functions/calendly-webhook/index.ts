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
        const eventTypeUri = invitee.event_type; // "https://api.calendly.com/event_types/..."
        const eventUri = invitee.event; // "https://api.calendly.com/scheduled_events/..."
        const calendlyEventId = invitee.uri; // "https://api.calendly.com/scheduled_events/.../invitees/..." (Invitee URI) OR we can use the event URI. 
        // User requested "Utilise l'ID d'invité de Calendly comme clé unique" -> invitee.uri is unique per invitee.
        const externalId = invitee.uri;

        // Init Supabase Admin (pour écrire dans bookings sans RLS restrictive et lire partners)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Récupérer le token du partenaire pour appeler l'API Calendly
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

        // 2. Fetch Event Type details from Calendly to find the URL/Slug
        // We need this to match against our 'offers' table 'calendly_url'
        const calendlyResp = await fetch(eventTypeUri, {
            headers: {
                'Authorization': `Bearer ${partner.calendly_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!calendlyResp.ok) {
            console.error("Failed to fetch event type from Calendly", await calendlyResp.text());
            return new Response(JSON.stringify({ error: 'Calendly API error' }), { status: 200, headers: corsHeaders });
        }

        const eventTypeData = await calendlyResp.json();
        const eventType = eventTypeData.resource;
        // eventType.scheduling_url looks like "https://calendly.com/username/type" or custom
        const schedulingUrl = eventType.scheduling_url;

        console.log("Scheduling URL found:", schedulingUrl);

        // 3. Find the Offer in DB
        // On cherche une offre qui A ce calendly_url.
        // Attention: parfois il peut y avoir des variations (http/https, query params).
        // On fait un check simple pour commencer.
        const { data: offers, error: offerError } = await supabaseAdmin
            .from('offers')
            .select('id, title')
            .eq('partner_id', partnerId) // Safety check
            .ilike('calendly_url', `${schedulingUrl}%`); // Starts with... pour gérer les params url

        if (offerError) console.error("Error searching offer", offerError);

        let offerId = null;
        if (offers && offers.length > 0) {
            offerId = offers[0].id;
            console.log("Offer found:", offers[0].title);
        } else {
            console.warn("No offer found matching Calendly URL:", schedulingUrl);
        }

        if (!offerId) {
            // Si on ne trouve pas d'offre, on peut quand même logger le booking ou ignorer via instruction user ?
            // "Insérer la réservation... en liant... le bon offer_id". 
            // Si pas d'offer_id, l'insert échouera car NOT NULL.
            console.error("Cannot proceed without offer_id");
            return new Response(JSON.stringify({ error: 'Offer not found' }), { status: 200, headers: corsHeaders });
        }

        // 4. Find User by Email
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        // listUsers n'est pas idéal pour chercher par email en masse mais limitation Edge Function ?
        // Mieux: utiliser RPC ou une table user_profiles si accessible.
        // Mais on a besoin du `auth.users.id` pour la FK `user_id`.
        // La table `user_profiles` contient l'email et le `user_id`. C'est plus efficace.

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('user_id')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            console.warn("User not found for email:", email);
            // On ne peut pas insérer sans user_id valide (FK).
            // Option: Créer un "Ghost User" ou ignorer?
            // Le user a dit: "liant le bon user_id (via l'email reçu)".
            // Si le gars n'est pas inscrit, c'est mort.
            return new Response(JSON.stringify({ error: 'User not found' }), { status: 200, headers: corsHeaders });
        }

        // 5. Insert Booking
        const { error: insertError } = await supabaseAdmin
            .from('bookings')
            .insert({
                user_id: profile.user_id,
                offer_id: offerId,
                booking_date: invitee.created_at, // Or event start time? 
                // Invitee payload has created_at (booking time). 
                // We probably want the Event Start Time.
                // Need to fetch Event details for Start Time?
                // "Payload.event" is the link. invitee payload DOES NOT have start_time usually, checking docs...
                // Calendly payload for invitee.created DOES NOT include start_time directly in `payload`. It's in the `event` resource.
                // So we MUST fetch the event resource too.
                customer_email: email,
                calendly_event_id: externalId, // storing URI as ID
                external_id: externalId, // Unique Key
                source: 'calendly',
                status: 'confirmed'
            });

        // Wait, let's fetch event start time to be cleaner
        const eventResp = await fetch(eventUri, {
            headers: { 'Authorization': `Bearer ${partner.calendly_token}` }
        });
        let bookingDate = invitee.created_at; // Fallback
        if (eventResp.ok) {
            const eventData = await eventResp.json();
            bookingDate = eventData.resource.start_time;
        }

        // Fetch price from variants (default to first variant found)
        const { data: variantData } = await supabaseAdmin
            .from('offer_variants')
            .select('price, discounted_price')
            .eq('offer_id', offerId)
            .limit(1)
            .single();

        const bookingAmount = variantData ? (variantData.discounted_price || variantData.price) : 0;

        // Re-attempt insert with correct date and amount
        const { error: finalInsertError } = await supabaseAdmin
            .from('bookings')
            .insert({
                user_id: profile.user_id,
                offer_id: offerId,
                booking_date: bookingDate,
                customer_email: email,
                calendly_event_id: externalId,
                external_id: externalId,
                source: 'calendly',
                status: 'confirmed',
                amount: bookingAmount,
                currency: 'EUR',
                partner_id: partnerId // Ensure partner_id is filled for payout attribution
            });

        if (finalInsertError) {
            if (finalInsertError.code === '23505') { // Unique violation
                console.log("Booking already exists (deduplication)");
                return new Response(JSON.stringify({ message: 'Duplicate skipped' }), { status: 200, headers: corsHeaders });
            }
            console.error("Error inserting booking", finalInsertError);
            return new Response(JSON.stringify({ error: 'DB Insert Error' }), { status: 200, headers: corsHeaders });
        }

        console.log("Booking inserted successfully!");
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
