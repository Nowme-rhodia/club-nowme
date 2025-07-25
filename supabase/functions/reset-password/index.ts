import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  console.log("🔐 reset-password Function: Lancement");

  // Gestion du CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
          'Access-Control-Allow-Origin': '*'
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
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 Tentative de réinitialisation...");
    const { data, error } = await adminClient.auth
      .resetPasswordForEmail(null, {
        password,
        token
      });

    if (error) {
      console.error("❌ Erreur Supabase:", error.message);
      return new Response(JSON.stringify({ error: 'Erreur Supabase', detail: error.message }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log("✅ Réinitialisation réussie");

    return new Response(JSON.stringify({
      success: true,
      user: data?.user ?? null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
