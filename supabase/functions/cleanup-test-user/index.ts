
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    try {
        const email = 'aboneetest@gmail.com'
        console.log(`🗑️ Starting cleanup for: ${email}`)

        // 1. Get User ID
        const { data: { users }, error: findError } = await supabase.auth.admin.listUsers()
        const user = users.find(u => u.email === email)

        if (!user) {
            console.log("⚠️ User not found in Auth")
            // Try to delete from user_profiles anyway if possible by email?
            const { data: profile } = await supabase.from('user_profiles').select('user_id').eq('email', email).maybeSingle()
            if (profile) {
                console.log(`Found orphaned profile for ${email}, deleting...`)
                await supabase.from('user_profiles').delete().eq('user_id', profile.user_id)
            }
            return new Response(JSON.stringify({ message: "User not found in Auth, checked profiles." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log(`Found User ID: ${user.id}`)

        // 2. Delete from tables MANUALLY to be sure
        console.log("Deleting from subscriptions...")
        await supabase.from('subscriptions').delete().eq('user_id', user.id)

        console.log("Deleting from user_profiles...")
        await supabase.from('user_profiles').delete().eq('user_id', user.id)

        // 3. Delete from Auth
        console.log("Deleting from Auth...")
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) throw deleteError

        return new Response(JSON.stringify({ success: true, message: `Deleted ${email}` }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        console.error('❌ Error:', err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
