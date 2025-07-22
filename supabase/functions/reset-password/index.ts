// reset-password.ts
// deno-lint-ignore-file no-explicit-any

// Utilisation de l'import compatible avec Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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

    console.log("Edge Function appelée avec token:", accessToken ? "présent" : "absent")

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

    console.log("Client Supabase créé avec URL:", Deno.env.get('SUPABASE_URL'))

    // Vérifier d'abord que le token est valide
    const { data: userData, error: verifyError } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (verifyError || !userData) {
      console.error('Erreur de vérification du token:', verifyError)
      return new Response(
        JSON.stringify({ error: 'Token invalide ou expiré', details: verifyError }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log("Token vérifié avec succès pour l'utilisateur:", userData.user.email)

    // Mettre à jour le mot de passe de l'utilisateur
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password: password }
    )

    if (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error)
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log("Mot de passe mis à jour avec succès pour:", data.user.email)

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
      JSON.stringify({ error: 'Erreur serveur interne', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})