
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Searching for partner...");
    const { data: partners, error } = await supabase
        .from('partners')
        .select('id, business_name, stripe_account_id, contact_email, website')
        .ilike('business_name', '%Monde en un Regard%');

    if (error) {
        console.error("Error fetching partners:", error);
        return;
    }

    if (!partners || partners.length === 0) {
        console.log("No partner found.");
        // Try by email
        const { data: partnersByEmail, error: emailError } = await supabase
            .from('partners')
            .select('id, business_name, stripe_account_id, contact_email, website')
            .ilike('contact_email', '%lemondeenunregard%');

        if (partnersByEmail && partnersByEmail.length > 0) {
            console.log("Found by email:", JSON.stringify(partnersByEmail[0], null, 2));
            await checkOffers(partnersByEmail[0]);
        } else {
            console.log("No partner found by email either.");
        }
        return;
    }

    console.log("Found partner:", JSON.stringify(partners[0], null, 2));
    await checkOffers(partners[0]);
}

async function checkOffers(partner) {
    console.log(`Checking offers for partner ${partner.business_name} (${partner.id})...`);

    const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('partner_id', partner.id);

    if (offersError) {
        console.error("Error fetching offers:", offersError);
    } else {
        console.log(`Found ${offers.length} offers.`);
        const restrictedKeywords = ['iran', 'cuba', 'syrie', 'syria', 'coree du nord', 'north korea', 'crimee', 'crimea', 'donetsk', 'luhansk', 'russie', 'russia'];

        let foundRestricted = false;
        offers.forEach(offer => {
            const textToSearch = (offer.title + " " + (offer.description || "") + " " + (offer.street_address || "") + " " + (offer.city || "")).toLowerCase();
            const detected = restrictedKeywords.filter(k => textToSearch.includes(k));

            console.log(`Offer: ${offer.title} (ID: ${offer.id}) - Status: ${offer.status || 'unknown'}`);

            if (detected.length > 0) {
                console.warn(`  !!!! RESTRICTED KEYWORDS DETECTED: ${detected.join(', ')} !!!!`);
                foundRestricted = true;
            } else {
                // console.log(`  - Clean`);
            }
        });

        if (!foundRestricted) {
            console.log("\n✅ No restricted keywords found in any offers for this partner.");
        } else {
            console.log("\n⚠️ Restricted keywords found!");
        }
    }

    // Check Bookings
    console.log("Checking bookings for this partner...");
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, created_at, amount, status, offer:offers!inner(title, partner_id)')
        .eq('offer.partner_id', partner.id);

    if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
    } else {
        console.log(`Found ${bookings.length} bookings for this partner.`);
        if (bookings.length > 0) {
            console.log("Latest booking:", bookings[0]);
        }
    }
}

inspect();
