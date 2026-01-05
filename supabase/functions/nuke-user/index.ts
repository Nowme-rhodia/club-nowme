
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email } = await req.json();

        if (!email) {
            return new Response("Missing email in body", { status: 400, headers: corsHeaders });
        }

        const logs: string[] = [];
        const log = (msg: string) => {
            console.log(msg);
            logs.push(msg);
        };

        log(`💥 Nuke User initiated for: ${email}`);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Find User
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (!user) {
            log("⚠️ User not found in Auth. Checking orphaned partners by email...");
            // Cleanup Orphaned Partners by email directly
            // FIRST delete dependencies of this potential orphan
            const { data: orphans } = await supabase.from('partners').select('id').eq('contact_email', email);
            if (orphans && orphans.length > 0) {
                for (const p of orphans) {
                    log(`Found orphan partner ${p.id}, creating emptiness...`);
                    await supabase.from('bookings').delete().eq('partner_id', p.id);
                    await supabase.from('offers').delete().eq('partner_id', p.id);
                    await supabase.from('partner_notifications').delete().eq('partner_id', p.id);
                    await supabase.from('partners').delete().eq('id', p.id);
                }
                log(`✅ Deleted ${orphans.length} orphaned partners for ${email}`);
            }

            return new Response(JSON.stringify({ message: `User ${email} not found in Auth. Cleaned orphans.`, logs }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        log(`✅ Found user ${user.id}. Starting deep cleanup...`);
        const userId = user.id;

        // 2. CHECK FOR PARTNER LINK
        // We must check if this user is a partner via user_profiles
        const { data: profile } = await supabase.from('user_profiles').select('partner_id').eq('user_id', userId).maybeSingle();

        if (profile?.partner_id) {
            const partnerId = profile.partner_id;
            log(`🔗 User is linked to Partner ${partnerId}. Nuking partner first...`);

            // A. Unlink profile (to allow partner deletion if RESTRICT constraint exists)
            await supabase.from('user_profiles').update({ partner_id: null }).eq('user_id', userId);

            // B. Delete Partner Dependencies
            // Bookings (as partner)
            const { count: bCount } = await supabase.from('bookings').delete().eq('partner_id', partnerId);
            log(`   - Deleted ${bCount} bookings (as partner)`);

            // Offers
            const { count: oCount } = await supabase.from('offers').delete().eq('partner_id', partnerId);
            log(`   - Deleted ${oCount} offers`);

            // Notifications
            const { count: nCount } = await supabase.from('partner_notifications').delete().eq('partner_id', partnerId);
            log(`   - Deleted ${nCount} notifications`);

            // C. Delete Partner
            const { error: pError } = await supabase.from('partners').delete().eq('id', partnerId);
            if (pError) log(`❌ Error deleting partner: ${pError.message}`);
            else log(`✅ Partner ${partnerId} obliterated.`);
        }

        // 3. User Dependencies Cleanup (Generic)
        // These are usually handled by CASCADE on auth.users -> user_profiles, but manual cleanup ensures no stragglers
        const tables = [
            { name: 'ambassador_applications', col: 'user_id', val: userId },
            { name: 'squad_members', col: 'user_id', val: userId },
            { name: 'micro_squads', col: 'creator_id', val: userId },
            { name: 'events', col: 'organizer_id', val: userId },
            { name: 'bookings', col: 'user_id', val: userId }, // Bookings as a customer
            { name: 'partner_reviews', col: 'user_id', val: userId },
        ];

        for (const t of tables) {
            const { error, count } = await supabase.from(t.name).delete().eq(t.col, t.val);
            if (error && error.code !== '42P01') { // Ignore table not found
                log(`⚠️ Issue deleting ${t.name}: ${error.message}`);
            } else if (count) {
                log(`🗑️ Deleted ${count} from ${t.name}`);
            }
        }

        // 4. Delete Auth User (The Big Red Button)
        const { error: delError } = await supabase.auth.admin.deleteUser(userId);

        if (delError) {
            log(`❌ Error deleting Auth user: ${delError.message}`);
            return new Response(JSON.stringify({ logs, error: delError }), { status: 500, headers: corsHeaders });
        }

        log(`✅ Successfully deleted Auth User ${userId} and all traces.`);

        return new Response(JSON.stringify({ success: true, logs }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
    }
});
