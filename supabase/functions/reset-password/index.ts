// reset-password.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

// Cette fonction Edge permet de réinitialiser le mot de passe d'un utilisateur
// en utilisant directement l'API Supabase avec le rôle de service
Deno.serve(async (req) => {
  try {
    // Vérifier que la méthode est POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Méthode non autorisée' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les données du corps de la requête
    const { accessToken, password } = await req.json()

    // Vérifier que les paramètres requis sont présents
    if (!accessToken || !password) {
      return new Response(
        JSON.stringify({ error: 'Token d\'accès et mot de passe requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier que le mot de passe est suffisamment long
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 8 caractères' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Créer un client Supabase avec le rôle de service
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

    // Vérifier d'abord que le token est valide
    const { data: userData, error: verifyError } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (verifyError || !userData) {
      console.error('Erreur de vérification du token:', verifyError)
      return new Response(
        JSON.stringify({ error: 'Token invalide ou expiré' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour le mot de passe de l'utilisateur
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password: password }
    )

    if (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Réponse réussie
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mot de passe mis à jour avec succès',
        user: { id: data.user.id, email: data.user.email }
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  } catch (err) {
    console.error('Erreur serveur:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})