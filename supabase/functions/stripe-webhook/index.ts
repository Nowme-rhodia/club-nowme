import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Solution compatible Deno pour vérifier la signature Stripe sans Buffer
async function verifyStripeSignature(request, secret) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    throw new Error('No signature found');
  }

  // Obtenir le corps brut de la requête
  const rawBody = await request.text();
  
  // Extraire les parties de la signature
  const signatureParts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  const timestamp = signatureParts.t;
  const signedPayload = `${timestamp}.${rawBody}`;
  
  // Vérifier manuellement la signature HMAC
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  // Vérifier chaque signature v1
  const signatures = signatureParts.v1.split(' ');
  let isValid = false;
  
  for (const sig of signatures) {
    const signatureBytes = hexToBytes(sig);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(signedPayload)
    );
    
    if (valid) {
      isValid = true;
      break;
    }
  }
  
  if (!isValid) {
    throw new Error('Signature verification failed');
  }
  
  // Analyser le corps en JSON
  return JSON.parse(rawBody);
}

// Convertir une chaîne hexadécimale en tableau d'octets
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Méthode non autorisée', { status: 405 });
    }

    // Cloner la requête pour pouvoir la lire plusieurs fois
    const reqClone = req.clone();
    
    // Vérifier la signature et obtenir l'événement
    let event;
    try {
      // Utiliser notre fonction personnalisée compatible Deno
      event = await verifyStripeSignature(reqClone, stripeWebhookSecret);
      console.log(`✅ Signature vérifiée avec succès pour l'événement ${event.id}`);
    } catch (err) {
      console.error(`❌ Erreur de vérification de la signature: ${err.message}`);
      return new Response(`Signature webhook invalide: ${err.message}`, { status: 400 });
    }

    // Préparer les données pour l'insertion
    const eventData = {
      stripe_event_id: event.id,
      event_type: event.type,
      customer_id: event.data.object.customer || null,
      customer_email: event.data.object.customer_email || event.data.object.customer_details?.email || null,
      subscription_id: event.data.object.subscription || null,
      amount: event.data.object.amount_total || event.data.object.amount || null,
      status: 'pending',
      raw_event: event,
      role: null, // Champ obligatoire pour éviter l'erreur CASE
    };

    // Insérer l'événement dans la base de données
    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert(eventData)
      .select('id')
      .single();

    if (insertError) {
      console.error(`❌ Erreur insertion événement webhook: ${insertError.message}`);
      return new Response('Erreur webhook', { status: 500 });
    }

    console.log(`✅ Événement ${event.id} enregistré avec succès (ID: ${webhookEvent.id})`);

    // Traiter l'événement selon son type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`ℹ️ Type d'événement non géré: ${event.type}`);
        break;
    }

    // Mettre à jour le statut de l'événement
    await supabase
      .from('stripe_webhook_events')
      .update({ status: 'completed' })
      .eq('id', webhookEvent.id);

    console.log(`✅ Traitement de l'événement ${event.id} terminé`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`❌ Erreur non gérée: ${err.message}`);
    return new Response(`Erreur interne: ${err.message}`, { status: 500 });
  }
});

async function handleCheckoutSessionCompleted(session) {
  try {
    console.log(`🔄 Traitement checkout.session.completed pour ${session.customer_email || 'utilisateur inconnu'}`);
    
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      console.error('❌ Email manquant dans la session checkout');
      return;
    }
    
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();
      
    if (userError && !userError.message.includes('No rows found')) {
      console.error(`❌ Erreur recherche utilisateur: ${userError.message}`);
      return;
    }

    if (!existingUser) {
      console.log(`➕ Création d'un nouvel utilisateur pour ${email}`);
      
      // Créer un utilisateur dans auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      
      if (authError || !authUser.user?.id) {
        console.error(`❌ Erreur création utilisateur auth: ${authError?.message}`);
        return;
      }
      
      console.log(`✅ Utilisateur auth créé: ${authUser.user.id}`);

      // Créer le profil utilisateur
      const { error: profileError } = await supabase.from('user_profiles').insert({
        user_id: authUser.user.id,
        email,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        subscription_type: session.metadata?.plan || 'monthly',
      });
      
      if (profileError) {
        console.error(`❌ Erreur création profil: ${profileError.message}`);
        return;
      }
      
      console.log(`✅ Profil utilisateur créé pour ${email}`);

      // Générer un lien de création de mot de passe
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        options: { redirectTo: 'https://club.nowme.fr/auth/update-password' },
      });
      
      if (linkError) {
        console.error(`❌ Erreur génération lien: ${linkError.message}`);
        return;
      }

      const confirmationUrl = linkData?.properties?.action_link;
      if (confirmationUrl) {
        console.log(`📧 Envoi email de bienvenue à ${email}`);
        
        // Envoyer l'email avec Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Nowme <contact@nowme.fr>',
            to: email,
            subject: 'Bienvenue sur Nowme ✨ Crée ton mot de passe',
            html: `<p>Bienvenue dans la communauté Nowme 💃</p>
                   <p>Tu peux créer ton mot de passe ici 👇</p>
                   <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>`,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Erreur envoi email: ${errorText}`);
        } else {
          console.log(`✅ Email de bienvenue envoyé à ${email}`);
        }
      }
    } else {
      console.log(`🔄 Mise à jour de l'utilisateur existant pour ${email}`);
      
      // Mettre à jour le profil existant
      const { error: updateError } = await supabase.from('user_profiles').update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        subscription_updated_at: new Date().toISOString(),
      }).eq('id', existingUser.id);
      
      if (updateError) {
        console.error(`❌ Erreur mise à jour profil: ${updateError.message}`);
        return;
      }
      
      console.log(`✅ Profil utilisateur mis à jour pour ${email}`);
    }
  } catch (err) {
    console.error(`❌ Erreur dans handleCheckoutSessionCompleted: ${err.message}`);
  }
}

async function handleSubscriptionChange(subscription) {
  try {
    console.log(`🔄 Traitement changement d'abonnement pour customer ${subscription.customer}`);
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();
      
    if (error) {
      console.error(`❌ Erreur recherche profil: ${error.message}`);
      return;
    }
    
    if (!profile) {
      console.log(`⚠️ Aucun profil trouvé pour customer ${subscription.customer}`);
      return;
    }
    
    const { error: updateError } = await supabase.from('user_profiles').update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    
    if (updateError) {
      console.error(`❌ Erreur mise à jour profil: ${updateError.message}`);
      return;
    }
    
    console.log(`✅ Statut d'abonnement mis à jour pour profil ${profile.id}`);
  } catch (err) {
    console.error(`❌ Erreur dans handleSubscriptionChange: ${err.message}`);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    console.log(`🔄 Traitement annulation d'abonnement pour customer ${subscription.customer}`);
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();
      
    if (error) {
      console.error(`❌ Erreur recherche profil: ${error.message}`);
      return;
    }
    
    if (!profile) {
      console.log(`⚠️ Aucun profil trouvé pour customer ${subscription.customer}`);
      return;
    }
    
    const { error: updateError } = await supabase.from('user_profiles').update({
      subscription_status: 'canceled',
      subscription_updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    
    if (updateError) {
      console.error(`❌ Erreur mise à jour profil: ${updateError.message}`);
      return;
    }
    
    console.log(`✅ Abonnement marqué comme annulé pour profil ${profile.id}`);
  } catch (err) {
    console.error(`❌ Erreur dans handleSubscriptionCancelled: ${err.message}`);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    console.log(`🔄 Traitement échec de paiement pour customer ${invoice.customer}`);
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', invoice.customer)
      .single();
      
    if (error) {
      console.error(`❌ Erreur recherche profil: ${error.message}`);
      return;
    }
    
    if (!profile) {
      console.log(`⚠️ Aucun profil trouvé pour customer ${invoice.customer}`);
      return;
    }
    
    const { error: updateError } = await supabase.from('user_profiles').update({
      subscription_status: 'past_due',
      payment_failed_at: new Date().toISOString(),
    }).eq('id', profile.id);
    
    if (updateError) {
      console.error(`❌ Erreur mise à jour profil: ${updateError.message}`);
      return;
    }
    
    console.log(`✅ Statut de paiement mis à jour pour profil ${profile.id}`);
  } catch (err) {
    console.error(`❌ Erreur dans handlePaymentFailed: ${err.message}`);
  }
} 