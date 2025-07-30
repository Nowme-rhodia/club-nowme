// admin-recreate-user.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // ✅ Gérer CORS pour les appels cross-origin
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // ✅ Refuser toute méthode autre que POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ✅ Vérification du token admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, redirectTo } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email et mot de passe requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📨 Tentative de création de compte pour ${email}`);

    // ✅ 1. Vérifier si l'utilisateur existe (même soft-deleted)
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (getUserError && getUserError.message !== 'User not found') {
      console.error('❌ Erreur getUserByEmail:', getUserError.message);
      return new Response(JSON.stringify({ error: getUserError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ✅ 2. Supprimer l'utilisateur s'il existe
    if (existingUser) {
      console.log(`🧹 Utilisateur existant trouvé : ${existingUser.id} → suppression...`);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id, true);

      if (deleteError) {
        console.error('❌ Erreur deleteUser:', deleteError.message);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ✅ 3. Créer le nouvel utilisateur
    console.log(`🚀 Création de ${email}...`);
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        created_from: 'edge_function',
        recreated: true,
        recreated_at: new Date().toISOString()
      }
    });

    if (createError) {
      console.error('❌ Erreur createUser:', createError.message);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!newUser) {
      return new Response(JSON.stringify({ error: 'Utilisateur créé mais aucune donnée retournée' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ✅ 4. Envoyer un email de réinitialisation si demandé
    if (redirectTo) {
      console.log(`✉️ Envoi d’un email recovery vers ${redirectTo}`);
      const { error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo }
      });

      if (recoveryError) {
        console.warn('⚠️ Erreur generateLink (email non envoyé):', recoveryError.message);
        // on continue quand même
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user: newUser,
      message: `✅ Utilisateur ${email} recréé avec succès`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('🔥 Erreur inattendue:', err.message || err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
