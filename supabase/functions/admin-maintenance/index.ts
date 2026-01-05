
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
        const { email, password, action } = await req.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400, headers: corsHeaders });
        }

        // Create Supabase client with SERVICE_ROLE_KEY to bypass RLS
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let userId;
        let message;

        // 1. Check if user exists
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);

        if (existingUser) {
            userId = existingUser.id;
            console.log(`User ${email} found (ID: ${userId}). Updating password...`);

            // Update Password
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                password: password,
                email_confirm: true
            });

            if (updateError) throw updateError;
            message = `Password updated for ${email}`;

        } else {
            console.log(`User ${email} not found. Creating...`);
            // Create User
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (createError) throw createError;
            userId = newUser.user.id;
            message = `User ${email} created`;
        }

        // 2. Ensure is_admin is true in user_profiles
        if (userId) {
            // Upsert profile to ensure it exists and sets is_admin
            const { error: profileError } = await supabase.from('user_profiles').upsert({
                user_id: userId,
                email: email,
                is_admin: true
            }, { onConflict: 'user_id' });

            if (profileError) {
                console.error("Profile update error:", profileError);
                return new Response(JSON.stringify({ error: "Failed to update profile", details: profileError }), { status: 500, headers: corsHeaders });
            }
        }

        return new Response(
            JSON.stringify({ success: true, message, userId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
