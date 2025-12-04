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

  try {
    // Utiliser le Service Role Key pour bypasser RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 get-user-profile - Fetching profile for userId:', userId)

    // Récupérer le profil utilisateur
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('🔍 get-user-profile - User data:', userData, 'error:', userError)

    // Récupérer les données partenaire si elles existent
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners')
      .select('id,user_id,status')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('🔍 get-user-profile - Partner data:', partnerData, 'error:', partnerError)

    return new Response(
      JSON.stringify({
        success: true,
        userData,
        partnerData,
        errors: {
          userError: userError?.message,
          partnerError: partnerError?.message
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('❌ get-user-profile error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || String(error) || 'Erreur inconnue' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
