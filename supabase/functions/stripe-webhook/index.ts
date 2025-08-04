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
  console.log('🎯 Webhook Stripe reçu');

  try {
    if (req.method !== 'POST') {
      return new Response('Méthode non autorisée', { status: 405 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    
    // Vérifier la signature si configurée
    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
        console.log('✅ Signature vérifiée');
      } catch (err) {
        console.error('❌ Signature invalide:', err.message);
        return new Response(`Signature invalide: ${err.message}`, { status: 400 });
      }
    } else {
      // Mode développement sans vérification de signature
      try {
        event = JSON.parse(rawBody);
        console.log('⚠️ Mode dev - signature non vérifiée');
      } catch (err) {
        console.error('❌ JSON invalide:', err.message);
        return new Response(`JSON invalide: ${err.message}`, { status: 400 });
      }
    }

    console.log(`📦 Événement: ${event.type} (${event.id})`);

    // Enregistrer l'événement
    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        customer_id: event.data.object.customer || null,
        customer_email: event.data.object.customer_email || 
                       event.data.object.customer_details?.email || null,
        subscription_id: event.data.object.subscription || null,
        amount: event.data.object.amount_total || event.data.object.amount || null,
        status: 'processing',
        raw_event: event,
        role: 'webhook'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Erreur enregistrement:', insertError.message);
      return new Response(`Erreur DB: ${insertError.message}`, { status: 500 });
    }

    console.log(`💾 Événement enregistré: ${webhookEvent.id}`);

    // Traiter l'événement
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`ℹ️ Événement non géré: ${event.type}`);
      }

      // Marquer comme complété
      await supabase
        .from('stripe_webhook_events')
        .update({ status: 'completed' })
        .eq('id', webhookEvent.id);

      console.log('✅ Traitement terminé');

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

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Erreur globale:', err.message);
    return new Response(`Erreur: ${err.message}`, { status: 500 });
  }
});

async function handleCheckoutCompleted(session: any) {
  console.log('🎉 Checkout complété');
  
  const email = session.customer_email || session.customer_details?.email;
  if (!email) {
    throw new Error('Email manquant dans la session');
  }

  console.log(`📧 Email client: ${email}`);

  // Vérifier si l'utilisateur existe
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('id, user_id')
    .eq('email', email)
    .single();

  if (existingUser) {
    console.log('👤 Utilisateur existant, mise à jour');
    
    // Mettre à jour le profil existant
    const { error } = await supabase
      .from('user_profiles')
      .update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
        subscription_type: session.metadata?.plan_type || 'monthly',
        subscription_updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id);

    if (error) throw error;
    
  } else {
    console.log('➕ Nouvel utilisateur, création complète');
    
    // Créer l'utilisateur auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        created_via: 'stripe_checkout',
        plan_type: session.metadata?.plan_type || 'monthly'
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
        subscription_type: session.metadata?.plan_type || 'monthly'
      });

    if (profileError) {
      throw new Error(`Erreur création profil: ${profileError.message}`);
    }

    console.log('✅ Profil créé');

    // Envoyer email d'invitation
    await sendWelcomeEmail(email, authUser.user.id);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('🔄 Abonnement mis à jour');
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_status: mapStripeStatus(subscription.status),
      subscription_updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', subscription.customer);

  if (error) throw error;
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('❌ Abonnement annulé');
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', subscription.customer);

  if (error) throw error;
}

async function handlePaymentFailed(invoice: any) {
  console.log('💳 Paiement échoué');
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'past_due',
      subscription_updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', invoice.customer);

  if (error) throw error;
}

async function sendWelcomeEmail(email: string, userId: string) {
  try {
    console.log('📧 Envoi email de bienvenue');
    
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

function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
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

function generateWelcomeEmailHTML(email: string, resetLink: string): string {
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