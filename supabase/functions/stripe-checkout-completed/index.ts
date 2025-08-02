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

// Edge Function spécifique pour l'événement checkout.session.completed
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Méthode non autorisée', { status: 405 });
    }

    // Récupérer le corps de la requête en tant que texte
    const rawBody = await req.text();
    console.log(`📦 Longueur du corps reçu: ${rawBody.length} caractères`);
    
    // Vérifier la signature Stripe si le secret est configuré
    let event;
    if (stripeWebhookSecret) {
      const signature = req.headers.get('stripe-signature');
      if (!signature) {
        console.error('❌ Signature Stripe manquante');
        return new Response('Signature Stripe manquante', { status: 400 });
      }
      
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
        console.log(`✅ Signature Stripe vérifiée pour l'événement ${event.id}`);
      } catch (err) {
        console.error(`❌ Erreur de vérification de signature: ${err.message}`);
        return new Response(`Erreur de vérification de signature: ${err.message}`, { status: 400 });
      }
    } else {
      // Analyser le corps JSON manuellement si pas de secret configuré
      try {
        event = JSON.parse(rawBody);
        console.log(`✅ Événement Stripe analysé: ${event.type} (ID: ${event.id})`);
      } catch (err) {
        console.error(`❌ Erreur d'analyse JSON: ${err.message}`);
        return new Response(`Erreur d'analyse JSON: ${err.message}`, { status: 400 });
      }
    }
    
    // Vérifier que c'est bien un événement checkout.session.completed
    if (event.type !== 'checkout.session.completed') {
      console.error(`❌ Type d'événement incorrect: ${event.type}, attendu: checkout.session.completed`);
      return new Response(`Type d'événement incorrect: ${event.type}`, { status: 400 });
    }

    // Préparer les données pour l'insertion
    const eventData = {
      stripe_event_id: event.id,
      event_type: event.type,
      customer_id: event.data.object.customer || null,
      customer_email: event.data.object.customer_email || 
                     (event.data.object.customer_details ? event.data.object.customer_details.email : null),
      subscription_id: event.data.object.subscription || null,
      amount: event.data.object.amount_total || event.data.object.amount || null,
      status: 'pending',
      raw_event: event,
      role: 'checkout', // Valeur non-null pour éviter les erreurs
    };

    // Log des données avant insertion pour debug
    console.log('📥 Données envoyées à Supabase :', JSON.stringify(eventData, null, 2));

    // Insérer l'événement dans la base de données
    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert(eventData)
      .select('id')
      .single();

    if (insertError) {
      console.error(`❌ Erreur insertion événement webhook: ${insertError.message}`);
      return new Response(`Erreur insertion événement webhook: ${insertError.message}`, { status: 500 });
    }

    console.log(`✅ Événement ${event.id} enregistré avec succès (ID: ${webhookEvent.id})`);

    // Traiter l'événement checkout.session.completed
    try {
      await handleCheckoutSessionCompleted(event.data.object);
      
      // Mettre à jour le statut de l'événement
      await supabase
        .from('stripe_webhook_events')
        .update({ status: 'completed' })
        .eq('id', webhookEvent.id);
        
      console.log(`✅ Traitement de l'événement ${event.id} terminé`);
    } catch (err) {
      console.error(`❌ Erreur lors du traitement de l'événement: ${err.message}`);
      
      // Mettre à jour le statut de l'événement en cas d'erreur
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          status: 'error',
          error: err.message
        })
        .eq('id', webhookEvent.id);
    }

    // Toujours renvoyer 200 à Stripe pour éviter les retentatives
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
    console.log(`🔄 Traitement checkout.session.completed`);
    
    // Extraire l'email de différentes sources possibles
    const email = session.customer_email || 
                 (session.customer_details ? session.customer_details.email : null);
                 
    if (!email) {
      console.error('❌ Email manquant dans la session checkout');
      throw new Error('Email manquant dans la session checkout');
    }
    
    console.log(`📧 Email client: ${email}`);
    
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
      throw userError;
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
        throw authError || new Error('Échec de création utilisateur');
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
        throw profileError;
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
        throw linkError;
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
          // On ne lance pas d'erreur ici pour ne pas bloquer le processus
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
        throw updateError;
      }
      
      console.log(`✅ Profil utilisateur mis à jour pour ${email}`);
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Erreur dans handleCheckoutSessionCompleted: ${err.message}`);
    throw err; // Propager l'erreur pour la journalisation
  }
}