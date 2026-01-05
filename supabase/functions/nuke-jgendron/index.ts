
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
    console.log("💥 Nuke Jgendron initiated...");

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const targetEmail = "jgendron.paris@gmail.com";

    // 1. Find User
    // Note: listUsers defaults to 50 users. If user is new, they should be in first page.
    // If not, we might need search.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listError) return new Response(JSON.stringify(listError), { status: 500 });

    const user = users.find(u => u.email === targetEmail);

    if (!user) {
        console.log("User not found in Auth");
        // Try to cleanup partners anyway by email
        const { error: pError } = await supabase.from('partners').delete().eq('contact_email', targetEmail);
        return new Response(`User ${targetEmail} not found in Auth. Partner cleanup result: ${pError ? pError.message : 'OK'}`, { status: 404 });
    }

    console.log(`Found user ${user.id}. Deleting...`);

    // 2. Delete Auth (Cascades to public.users usually, but we force cleanup)
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);

    if (delError) {
        return new Response(JSON.stringify(delError), { status: 500 });
    }

    // 3. Extra Cleanup (just in case cascade is weak)
    // Partner
    await supabase.from('partners').delete().eq('user_id', user.id);
    await supabase.from('partners').delete().eq('contact_email', targetEmail);

    // Profile (should be gone via cascade but ensuring)
    await supabase.from('user_profiles').delete().eq('user_id', user.id);

    return new Response(`✅ Successfully nuked ${targetEmail} (ID: ${user.id})`, {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
});
