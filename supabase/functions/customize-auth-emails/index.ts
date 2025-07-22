// customize-auth-email.ts
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

// Types pour les événements d'authentification
interface WebhookPayload {
  type: 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change' | 'phone_change'
  email: string
  new_email?: string
  url: string
  [key: string]: any
}

Deno.serve(async (req) => {
  try {
    // Vérifier que la méthode est POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Récupérer les données du webhook
    const payload: WebhookPayload = await req.json()
    
    // Vérifier que les données nécessaires sont présentes
    if (!payload || !payload.type || !payload.email) {
      return new Response(JSON.stringify({ error: 'Données invalides' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Webhook reçu pour ${payload.type} - email: ${payload.email}`)

    // Créer un client Supabase avec le rôle de service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Personnaliser l'email en fonction du type d'événement
    let subject = ''
    let content = ''
    let actionUrl = payload.url

    switch (payload.type) {
      case 'signup':
        subject = 'Bienvenue sur notre plateforme'
        content = `
          <h2>Bienvenue !</h2>
          <p>Merci de vous être inscrit. Veuillez confirmer votre email en cliquant sur le lien ci-dessous :</p>
          <p><a href="${actionUrl}">Confirmer mon email</a></p>
        `
        break
      
      case 'recovery':
        subject = 'Réinitialisation de votre mot de passe'
        content = `
          <h2>Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
          <p><a href="${actionUrl}">Réinitialiser mon mot de passe</a></p>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
        `
        break
      
      case 'magiclink':
        subject = 'Votre lien de connexion'
        content = `
          <h2>Connexion sans mot de passe</h2>
          <p>Cliquez sur le lien ci-dessous pour vous connecter :</p>
          <p><a href="${actionUrl}">Me connecter</a></p>
        `
        break
      
      case 'email_change':
        subject = 'Confirmation de changement d\'email'
        content = `
          <h2>Changement d'adresse email</h2>
          <p>Vous avez demandé à changer votre adresse email de ${payload.email} à ${payload.new_email}.</p>
          <p>Cliquez sur le lien ci-dessous pour confirmer ce changement :</p>
          <p><a href="${actionUrl}">Confirmer le changement d'email</a></p>
        `
        break
      
      default:
        // Utiliser l'email par défaut de Supabase
        return new Response(JSON.stringify({ message: 'Utilisation de l\'email par défaut' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
    }

    // Envoyer l'email personnalisé
    // Note: Dans un cas réel, vous utiliseriez un service d'envoi d'emails comme SendGrid, Mailgun, etc.
    // Pour cet exemple, nous simulons l'envoi et retournons le contenu
    
    console.log(`Email personnalisé préparé pour ${payload.email} - Sujet: ${subject}`)
    
    // Retourner une réponse de succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email personnalisé préparé',
        details: {
          to: payload.email,
          subject: subject,
          // Ne pas inclure le contenu complet dans les logs pour des raisons de sécurité
          contentLength: content.length
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
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