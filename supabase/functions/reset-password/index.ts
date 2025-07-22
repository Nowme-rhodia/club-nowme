import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accessToken, password } = await req.json()

    console.log("Edge Function called with token:", accessToken ? "present" : "absent")

    if (!accessToken || !password) {
      return new Response(
        JSON.stringify({ error: 'Access token and password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log("Supabase client created with URL:", Deno.env.get('SUPABASE_URL'))

    const { data: userData, error: verifyError } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (verifyError || !userData) {
      console.error('Token verification error:', verifyError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: verifyError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("Token verified successfully for user:", userData.user.email)

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password: password }
    )

    if (error) {
      console.error('Error updating password:', error)
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log("Password updated successfully for:", data.user.email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password updated successfully',
        user: { id: data.user.id, email: data.user.email }
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (err) {
    console.error('Server error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})