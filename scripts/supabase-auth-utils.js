import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

// Fonction principale qui gère les requêtes
Deno.serve(async (req) => {
  try {
    // Vérifier si la méthode est POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer le corps de la requête
    const body = await req.json();
    const { action, ...params } = body;

    // Initialiser le client Supabase avec le token d'autorisation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification de l'utilisateur si nécessaire
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError) {
        return new Response(JSON.stringify({ error: 'Erreur d\'authentification', details: authError }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      userId = user?.id;
    }

    // Traiter les différentes actions
    let result;
    
    switch (action) {
      case 'getUserInfo':
        result = await getUserInfo(supabaseClient, userId || params.userId);
        break;
        
      case 'listUsers':
        // Cette action nécessite des privilèges d'administrateur
        result = await listUsers(supabaseClient, params.page, params.perPage);
        break;
        
      case 'createUser':
        result = await createUser(supabaseClient, params);
        break;
        
      case 'updateUser':
        result = await updateUser(supabaseClient, params);
        break;
        
      case 'deleteUser':
        result = await deleteUser(supabaseClient, params.userId);
        break;
        
      case 'generateResetPasswordLink':
        result = await generateResetPasswordLink(supabaseClient, params.email, params.redirectTo);
        break;
        
      case 'inviteUser':
        result = await inviteUser(supabaseClient, params.email, params.redirectTo);
        break;
        
      case 'assignRoleToUser':
        result = await assignRoleToUser(supabaseClient, params.userId, params.role);
        break;
        
      default:
        return new Response(JSON.stringify({ error: 'Action non reconnue' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erreur interne du serveur', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Fonction pour obtenir les informations d'un utilisateur
async function getUserInfo(supabase, userId) {
  if (!userId) {
    return { error: 'ID utilisateur requis' };
  }

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  
  if (error) {
    return { error: error.message };
  }
  
  // Récupérer les données de profil supplémentaires si nécessaire
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return {
    user: data.user,
    profile: profileError ? null : profileData
  };
}

// Fonction pour lister les utilisateurs (pagination)
async function listUsers(supabase, page = 0, perPage = 10) {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    page: page,
    perPage: perPage
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { users };
}

// Fonction pour créer un nouvel utilisateur
async function createUser(supabase, { email, password, userData = {}, autoConfirm = false }) {
  if (!email || !password) {
    return { error: 'Email et mot de passe requis' };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: autoConfirm,
    user_metadata: userData
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { user: data.user };
}

// Fonction pour mettre à jour un utilisateur
async function updateUser(supabase, { userId, userData = {}, email, password }) {
  if (!userId) {
    return { error: 'ID utilisateur requis' };
  }

  const updateData = {};
  
  if (email) updateData.email = email;
  if (password) updateData.password = password;
  if (Object.keys(userData).length > 0) updateData.user_metadata = userData;

  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    updateData
  );
  
  if (error) {
    return { error: error.message };
  }
  
  return { user: data.user };
}

// Fonction pour supprimer un utilisateur
async function deleteUser(supabase, userId) {
  if (!userId) {
    return { error: 'ID utilisateur requis' };
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true, message: 'Utilisateur supprimé avec succès' };
}

// Fonction pour générer un lien de réinitialisation de mot de passe
async function generateResetPasswordLink(supabase, email, redirectTo) {
  if (!email) {
    return { error: 'Email requis' };
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true, message: 'Email de réinitialisation envoyé' };
}

// Fonction pour inviter un utilisateur
async function inviteUser(supabase, email, redirectTo) {
  if (!email) {
    return { error: 'Email requis' };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo || undefined
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true, message: 'Invitation envoyée' };
}

// Fonction pour attribuer un rôle à un utilisateur
async function assignRoleToUser(supabase, userId, role) {
  if (!userId || !role) {
    return { error: 'ID utilisateur et rôle requis' };
  }

  // Récupérer l'utilisateur actuel
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  
  if (userError) {
    return { error: userError.message };
  }
  
  // Mettre à jour les métadonnées avec le nouveau rôle
  const currentMetadata = userData.user.app_metadata || {};
  currentMetadata.role = role;
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { app_metadata: currentMetadata }
  );
  
  if (error) {
    return { error: error.message };
  }
  
  return { 
    success: true, 
    message: `Rôle ${role} attribué à l'utilisateur`,
    user: data.user
  };
}