import { createClient } from 'jsr:@supabase/supabase-js@^2'
import { Stripe } from 'npm:stripe@^14.5.0'

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

// Webhook secret pour vérifier les signatures
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Méthode non autorisée', { status: 405 })
    }

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response('Signature manquante', { status: 400 })
    }

    // Vérifier la signature du webhook
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error(`⚠️ Erreur de signature webhook: ${err.message}`)
      return new Response(`Signature webhook invalide: ${err.message}`, { status: 400 })
    }

    // Initialiser le client Supabase avec la clé de service pour contourner RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Extraire les informations pertinentes de l'événement
    const eventType = event.type
    const stripeEventId = event.id
    
    // Extraire les informations du client et de l'abonnement si disponibles
    let customerId = null
    let customerEmail = null
    let subscriptionId = null
    let amount = null
    let role = null

    // Traiter différents types d'événements
    if (event.data.object) {
      const eventObject = event.data.object
      
      // Extraire les informations du client
      if (eventObject.customer) {
        customerId = typeof eventObject.customer === 'string' 
          ? eventObject.customer 
          : eventObject.customer.id
      }
      
      // Extraire l'email du client
      if (eventObject.customer_email) {
        customerEmail = eventObject.customer_email
      } else if (eventObject.customer_details?.email) {
        customerEmail = eventObject.customer_details.email
      }
      
      // Extraire l'ID d'abonnement
      if (eventObject.subscription) {
        subscriptionId = typeof eventObject.subscription === 'string'
          ? eventObject.subscription
          : eventObject.subscription.id
      }
      
      // Extraire le montant pour les paiements
      if (eventObject.amount) {
        amount = eventObject.amount / 100 // Convertir de centimes à euros
      } else if (eventObject.amount_total) {
        amount = eventObject.amount_total / 100
      }

      // Déterminer le rôle (premium, discovery, etc.) basé sur les métadonnées ou le produit
      if (eventObject.metadata?.role) {
        role = eventObject.metadata.role
      } else if (eventObject.items?.data?.[0]?.price?.product) {
        // Récupérer les informations du produit si nécessaire
        try {
          const productId = eventObject.items.data[0].price.product
          if (typeof productId === 'string') {
            const product = await stripe.products.retrieve(productId)
            role = product.metadata?.role || null
          }
        } catch (err) {
          console.error(`Erreur lors de la récupération du produit: ${err.message}`)
        }
      }
    }

    // Enregistrer l'événement dans la base de données
    const { data, error } = await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: stripeEventId,
        event_type: eventType,
        customer_id: customerId,
        customer_email: customerEmail,
        subscription_id: subscriptionId,
        amount: amount,
        status: 'pending',
        raw_event: event,
        role: role
      })

    if (error) {
      console.error('Erreur lors de l\'enregistrement de l\'événement:', error)
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Traitement spécifique selon le type d'événement
    if (eventType === 'checkout.session.completed') {
      // Mettre à jour le statut de l'abonnement de l'utilisateur
      if (customerEmail) {
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_updated_at: new Date().toISOString()
          })
          .eq('email', customerEmail)
          .select()

        if (userError) {
          console.error('Erreur lors de la mise à jour du profil utilisateur:', userError)
        }
      }
    } else if (eventType === 'customer.subscription.updated') {
      // Mettre à jour le statut de l'abonnement
      if (customerId) {
        const status = event.data.object.status
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: status,
            subscription_updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId)

        if (updateError) {
          console.error('Erreur lors de la mise à jour du statut d\'abonnement:', updateError)
        }
      }
    }

    // Marquer l'événement comme traité
    await supabase
      .from('stripe_webhook_events')
      .update({ status: 'completed' })
      .eq('stripe_event_id', stripeEventId)

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(`Erreur non gérée: ${err.message}`)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})