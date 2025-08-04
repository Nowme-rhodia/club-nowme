import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  console.log('🎯 Webhook Stripe reçu - Method:', req.method);

  try {
    if (req.method !== 'POST') {
      console.log('❌ Méthode non autorisée:', req.method);
      return new Response('Méthode non autorisée', { status: 405 });
    }

    const rawBody = await req.text();
    console.log('📦 Body reçu, longueur:', rawBody.length);

    if (!rawBody || rawBody.length === 0) {
      console.log('❌ Body vide');
      return new Response('Body vide', { status: 400 });
    }

    const signature = req.headers.get('stripe-signature');
    console.log('🔐 Signature présente:', !!signature);

    let event;
    
    // Vérifier la signature si configurée
    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
        console.log('✅ Signature vérifiée pour événement:', event.type);
      } catch (err) {
        console.error('❌ Signature invalide:', err.message);
        return new Response(`Signature invalide: ${err.message}`, { status: 400 });
      }
    } else {
      // Mode développement sans vérification de signature
      try {
        event = JSON.parse(rawBody);
        console.log('⚠️ Mode dev - événement parsé:', event.type);
      } catch (err) {
        console.error('❌ JSON invalide:', err.message);
        return new Response(`JSON invalide: ${err.message}`, { status: 400 });
      }
    }

    if (!event || !event.type) {
      console.log('❌ Événement invalide');
      return new Response('Événement invalide', { status: 400 });
    }

    console.log(`📦 Traitement événement: ${event.type} (${event.id})`);

    // Préparer les données pour l'insertion
    const eventData = {
      stripe_event_id: event.id,
      event_type: event.type,
      customer_id: null,
      customer_email: null,
      subscription_id: null,
      amount: null,
      status: 'processing',
      raw_event: event,
      role: 'webhook'
    };

    // Extraire les données selon le type d'événement
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          eventData.customer_id = event.data.object.customer;
          eventData.customer_email = event.data.object.customer_email || 
                                   event.data.object.customer_details?.email;
          eventData.subscription_id = event.data.object.subscription;
          eventData.amount = event.data.object.amount_total;
          break;
        
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
        case 'customer.subscription.created':
          eventData.customer_id = event.data.object.customer;
          eventData.subscription_id = event.data.object.id;
          break;
        
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          eventData.customer_id = event.data.object.customer;
          eventData.customer_email = event.data.object.customer_email;
          eventData.subscription_id = event.data.object.subscription;
          eventData.amount = event.data.object.amount_paid || event.data.object.amount_due;
          break;
      }
    } catch (extractError) {
      console.error('⚠️ Erreur extraction données:', extractError.message);
      // Continuer quand même avec les données de base
    }

    console.log('💾 Données à insérer:', {
      type: eventData.event_type,
      email: eventData.customer_email,
      customer: eventData.customer_id
    });

    // Enregistrer l'événement
    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert(eventData)
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Erreur enregistrement:', insertError.message);
      return new Response(`Erreur DB: ${insertError.message}`, { status: 500 });
    }

    console.log(`✅ Événement enregistré: ${webhookEvent.id}`);

    // Traiter l'événement
    try {
      let result = { success: true, message: 'Événement traité' };

      switch (event.type) {
        case 'checkout.session.completed':
          result = await handleCheckoutCompleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          result = await handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'customer.subscription.updated':
          result = await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          result = await handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_failed':
          result = await handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`ℹ️ Événement non géré mais enregistré: ${event.type}`);
          result = { success: true, message: `Événement ${event.type} enregistré` };
      }

      // Marquer comme complété
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          status: result.success ? 'completed' : 'failed',
          error: result.success ? null : result.message
        })
        .eq('id', webhookEvent.id);

      console.log('✅ Traitement terminé:', result.message);

    } catch (err) {
      console.error('❌ Erreur traitement:', err.message);
      
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          status: 'failed',
          error: err.message
        })
        .eq('id', webhookEvent.id);
    }

    return new Response(JSON.stringify({ 
      received: true, 
      event_id: event.id,
      event_type: event.type 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Erreur globale:', err.message);
    return new Response(`Erreur: ${err.message}`, { status: 500 });
  }
});

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('💳 Traitement invoice.payment_succeeded');
  
  try {
    const email = invoice.customer_email;
    if (!email) {
      console.log('⚠️ Pas d\'email dans la facture');
      return { success: true, message: 'Facture sans email, ignorée' };
    }

    // Mettre à jour le statut de paiement
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'active',
        subscription_updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (error) {
      console.error('❌ Erreur mise à jour paiement:', error.message);
      return { success: false, message: `Erreur mise à jour: ${error.message}` };
    }

    console.log('✅ Paiement confirmé pour:', email);
    return { success: true, message: `Paiement confirmé pour ${email}` };
  } catch (error) {
    console.error('❌ Erreur handleInvoicePaymentSucceeded:', error.message);
    return { success: false, message: error.message };
  }
}

async function handleCheckoutCompleted(session) {
  console.log('🎉 Traitement checkout.session.completed');
  
  try {
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      throw new Error('Email manquant dans la session');
    }

    console.log(`📧 Email client: ${email}`);

    // Vérifier si l'utilisateur existe
    const { data: existingUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id, user_id')
      .eq('email', email)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      throw new Error(`Erreur recherche utilisateur: ${userError.message}`);
    }

    // Déterminer le type d'abonnement
    const subscriptionType = session.amount_total === 39900 ? 'yearly' : 
                           session.amount_total === 1299 ? 'discovery' : 'monthly';
    console.log(`💰 Type abonnement détecté: ${subscriptionType} (${session.amount_total})`);

    if (existingUser) {
      console.log('👤 Utilisateur existant, mise à jour');
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
          subscription_type: subscriptionType,
          subscription_updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      return { success: true, message: `Utilisateur ${existingUser.id} mis à jour` };
      
    } else {
      console.log('➕ Nouvel utilisateur, création complète');
      
      // Créer l'utilisateur auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          created_via: 'stripe_checkout',
          plan_type: subscriptionType
        }
      });

      if (authError || !authUser.user) {
        throw new Error(`Erreur création auth: ${authError?.message}`);
      }

      console.log(`✅ Utilisateur auth créé: ${authUser.user.id}`);

      // Créer le profil
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authUser.user.id,
          email,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
          subscription_type: subscriptionType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        throw new Error(`Erreur création profil: ${profileError.message}`);
      }

      console.log('✅ Profil créé');

      // Envoyer email d'invitation
      await sendWelcomeEmail(email);

      return { success: true, message: `Nouvel utilisateur créé: ${authUser.user.id}` };
    }
  } catch (error) {
    console.error('❌ Erreur handleCheckoutCompleted:', error.message);
    return { success: false, message: error.message };
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Traitement subscription.updated');
  
  try {
    const status = mapStripeStatus(subscription.status);
    
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: status,
        subscription_updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer);

    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }

    return { success: true, message: `Abonnement mis à jour: ${status}` };
  } catch (error) {
    console.error('❌ Erreur handleSubscriptionUpdated:', error.message);
    return { success: false, message: error.message };
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('❌ Traitement subscription.deleted');
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'cancelled',
        subscription_updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer);

    if (error) {
      throw new Error(`Erreur annulation: ${error.message}`);
    }

    return { success: true, message: 'Abonnement annulé' };
  } catch (error) {
    console.error('❌ Erreur handleSubscriptionDeleted:', error.message);
    return { success: false, message: error.message };
  }
}

async function handlePaymentFailed(invoice) {
  console.log('💳 Traitement payment.failed');
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'past_due',
        subscription_updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', invoice.customer);

    if (error) {
      throw new Error(`Erreur paiement échoué: ${error.message}`);
    }

    return { success: true, message: 'Statut paiement mis à jour' };
  } catch (error) {
    console.error('❌ Erreur handlePaymentFailed:', error.message);
    return { success: false, message: error.message };
  }
}

async function sendWelcomeEmail(email) {
  try {
    console.log('📧 Préparation email de bienvenue pour:', email);
    
    // Générer le lien de création de mot de passe
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });

    if (linkError) {
      throw new Error(`Erreur génération lien: ${linkError.message}`);
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      throw new Error('Lien de réinitialisation non généré');
    }

    console.log('🔗 Lien généré, ajout à la queue email');

    // Ajouter l'email à la queue
    const { error: emailError } = await supabase
      .from('emails')
      .insert({
        to_address: email,
        subject: 'Bienvenue dans le Nowme Club ! 🎉',
        content: generateWelcomeEmailHTML(email, resetLink),
        status: 'pending'
      });

    if (emailError) {
      throw new Error(`Erreur ajout email: ${emailError.message}`);
    }

    console.log('✅ Email ajouté à la queue');

  } catch (error) {
    console.error('❌ Erreur envoi email:', error.message);
    // Ne pas faire échouer le webhook pour un problème d'email
  }
}

function mapStripeStatus(stripeStatus) {
  const statusMap = {
    'active': 'active',
    'past_due': 'past_due',
    'unpaid': 'unpaid',
    'canceled': 'cancelled',
    'incomplete': 'pending',
    'incomplete_expired': 'cancelled',
    'trialing': 'active'
  };
  
  return statusMap[stripeStatus] || 'pending';
}

function generateWelcomeEmailHTML(email, resetLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bienvenue dans le Nowme Club !</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #BF2778; font-size: 28px; margin-bottom: 10px;">🎉 Bienvenue dans le Nowme Club !</h1>
    <p style="font-size: 18px; color: #666;">Ton aventure kiff commence maintenant !</p>
  </div>

  <div style="background: linear-gradient(135deg, #BF2778, #E4D44C); color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
    <h2 style="margin: 0 0 15px 0; font-size: 22px;">✨ Ton compte est créé !</h2>
    <p style="margin: 0; font-size: 16px;">Il ne reste qu'une étape : créer ton mot de passe pour accéder à ton espace membre.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
      🔐 Créer mon mot de passe
    </a>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0;">
    <h3 style="color: #BF2778; margin-top: 0;">🎯 Ce qui t'attend :</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Événements premium chaque mois</li>
      <li>Masterclass avec des expertes</li>
      <li>Box surprise trimestrielle</li>
      <li>Consultations bien-être gratuites</li>
      <li>Réductions jusqu'à -70%</li>
      <li>Communauté de femmes inspirantes</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0; padding: 20px; border: 2px dashed #BF2778; border-radius: 10px;">
    <p style="margin: 0; color: #BF2778; font-weight: bold;">🚨 Important : Ce lien expire dans 24h</p>
    <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Clique dessus dès maintenant pour ne pas le perdre !</p>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="margin: 0; color: #666; font-size: 14px;">
      Des questions ? Réponds à cet email ou contacte-nous sur 
      <a href="mailto:contact@nowme.fr" style="color: #BF2778;">contact@nowme.fr</a>
    </p>
    <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
      L'équipe Nowme 💕
    </p>
  </div>
</body>
</html>`;
}