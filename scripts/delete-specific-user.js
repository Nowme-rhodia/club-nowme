
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Erreur: SUPABASE_URL ou SERVICE_ROLE_KEY manquant dans .env")
    process.exit(1)
}

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function main() {
    const targetEmail = "aboneetest@gmail.com";
    console.log(`🚀 Starting cleanup for: ${targetEmail}`);

    // 1. Find User ID
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }

    const user = users.find(u => u.email === targetEmail);

    if (!user) {
        console.log("❌ User not found in auth.users");
        // Try to find in partners or user_profiles by email just in case
    } else {
        console.log(`✅ Found Auth User: ${user.id}`);
    }

    // 2. Find Partner ID (if exists)
    const { data: partner } = await adminSupabase
        .from('partners')
        .select('id')
        .eq('contact_email', targetEmail)
        .maybeSingle();

    if (partner) {
        console.log(`✅ Found Partner Record: ${partner.id}`);

        // 3. Delete Offers (and cascade bookings if set, otherwise queries needed)
        // Let's try to delete offers directly
        const { error: offersError, count: offersCount } = await adminSupabase
            .from('offers')
            .delete({ count: 'exact' })
            .eq('partner_id', partner.id);

        if (offersError) console.error("Error deleting offers:", offersError);
        else console.log(`🗑️ Deleted ${offersCount} offers.`);

        // 4. Delete Partner
        const { error: partnerDelError } = await adminSupabase
            .from('partners')
            .delete()
            .eq('id', partner.id);

        if (partnerDelError) console.error("Error deleting partner:", partnerDelError);
        else console.log("🗑️ Deleted partner record.");
    } else {
        console.log("ℹ️ No partner record found with this email.");
    }

    // 5. Delete User Profile
    // (Might use user.id if found, or email)
    if (user) {
        const { error: profileError } = await adminSupabase
            .from('user_profiles')
            .delete()
            .eq('user_id', user.id);

        if (profileError) console.error("Error deleting profile:", profileError);
        else console.log("🗑️ Deleted user_profile.");

        // 6. Delete Auth User
        const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(user.id);
        if (deleteUserError) console.error("Error deleting auth user:", deleteUserError);
        else console.log("🗑️ Deleted auth.users record.");
    }

    console.log("🏁 Cleanup complete.");
}

main();
