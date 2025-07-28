import { createClient } from 'jsr:@supabase/supabase-js@^2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

Deno.serve(async (req) => {
  console.log("🔐 reset-password Function: Démarrage");

  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    const { password, token } = await req.json();
    console.log("🛠 Données reçues:", { hasPassword: !!password, hasToken: !!token });

    if (!password || !token) {
      return new Response(JSON.stringify({ error: 'Mot de passe ou token manquant' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log("🌍 SUPABASE_URL:", supabaseUrl);
    console.log("🔑 SERVICE_ROLE_KEY existe:", !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Configuration Supabase manquante' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // ✅ CORRECTION : Utiliser le client admin avec la bonne méthode
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // ✅ CORRECTION : Utiliser updateUser avec le token dans l'en-tête
    const { data, error } = await adminClient.auth.admin.updateUserById(
      // On doit d'abord décoder le token pour obtenir l'user_id
      // Mais comme on n'a que le token, on va utiliser une approche différente
      '', // user_id sera déterminé par le token
      { password }
    );

    // ✅ MEILLEURE APPROCHE : Utiliser l'API REST directement
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Erreur API:", errorData);
      return new Response(JSON.stringify({ 
        error: 'Erreur lors de la mise à jour', 
        detail: errorData.message || 'Token invalide ou expiré'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const userData = await response.json();
    console.log("✅ Mot de passe mis à jour avec succès");

    return new Response(JSON.stringify({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (err) {
    console.error("💥 Erreur inattendue:", err.message);
    return new Response(JSON.stringify({
      error: 'Erreur serveur',
      detail: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});