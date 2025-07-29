// reset-password.ts
import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

Deno.serve(async (req) => {
  // Gestion des requêtes CORS preflight
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

  // Vérification de la méthode HTTP
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    // Récupération du corps de la requête et du token d'authentification
    const { password } = await req.json();
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    console.log('📝 Demande de réinitialisation de mot de passe reçue');
    console.log('🔑 Token présent:', !!token);

    // Validation des entrées
    if (!password) {
      console.log('❌ Mot de passe manquant');
      return new Response(JSON.stringify({ error: 'Mot de passe manquant' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!token) {
      console.log('❌ Token d\'authentification manquant');
      return new Response(JSON.stringify({ error: 'Token d\'authentification manquant' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Validation du mot de passe
    if (password.length < 8) {
      console.log('❌ Mot de passe trop court');
      return new Response(JSON.stringify({ error: 'Le mot de passe doit contenir au moins 8 caractères' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Initialisation du client Supabase avec les variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRole) {
      console.error('❌ Variables d\'environnement manquantes');
      return new Response(JSON.stringify({ error: 'Configuration du serveur incorrecte' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Création du client Supabase avec le rôle de service
    const supabase = createClient(supabaseUrl, serviceRole);

    console.log('🔄 Tentative de mise à jour du mot de passe...');

    // MÉTHODE 1: Utiliser updateUser avec le token d'accès
    const { data, error } = await supabase.auth.updateUser(
      { password },
      { accessToken: token }
    );

    if (error) {
      console.error('❌ Erreur lors de la mise à jour:', error.message);
      
      // Gestion spécifique des erreurs
      if (error.message.includes('rate limit')) {
        return new Response(JSON.stringify({ error: 'Trop de tentatives. Veuillez réessayer plus tard.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      if (error.message.includes('token')) {
        return new Response(JSON.stringify({ error: 'Token invalide ou expiré' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Vérification que l'utilisateur a bien été mis à jour
    if (!data?.user) {
      console.error('❌ Aucune donnée utilisateur retournée');
      return new Response(JSON.stringify({ error: 'Échec de la mise à jour du mot de passe' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log('✅ Mot de passe mis à jour avec succès');

    // Réponse de succès
    return new Response(JSON.stringify({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
      user: {
        id: data.user.id,
        email: data.user.email,
        updated_at: data.user.updated_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    // Gestion des erreurs inattendues
    console.error('💥 Erreur inattendue:', err.message);
    return new Response(JSON.stringify({ error: 'Une erreur inattendue est survenue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});