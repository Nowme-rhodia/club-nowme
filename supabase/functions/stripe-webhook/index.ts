import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Environment variables  
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Initialize Stripe with proper API version
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper for consistent logging
const logger = {
  info: (message, data = {}) => console.log(`ℹ️ ${message}`, data),
  success: (message, data = {}) => console.log(`✅ ${message}`, data),
  warn: (message, data = {}) => console.warn(`⚠️ ${message}`, data),
  error: (message, error = null) => {
    console.error(`❌ ${message}`);
    if (error) {
      console.error(`  Error details: ${error.message || error}`);
      if (error.stack) console.error(`  Stack: ${error.stack}`);
    }
  }
};

Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    logger.warn(`Method not allowed: ${req.method}`);
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get the raw request body as text
    const rawBody = await req.text();
    logger.info(`Webhook received - Body length: ${rawBody.length}`);
    
    if (!rawBody || rawBody.length === 0) {
      logger.error('Empty request body');
      return new Response('Empty request body', { status: 400 });
    }

    // Get the Stripe signature from headers
    const signature = req.headers.get('stripe-signature');
    
    // Parse and verify the event
    let event;
    let isVerified = false;
    
    // Try to verify with signature if webhook secret is configured
    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
        isVerified = true;
        logger.success(`Signature verified for event: ${event.type}`);
      } catch (err) {
        logger.error('Signature verification failed', err);
        return new Response(`Webhook signature verification failed: ${err.message}`, { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Development mode - parse without verification
      try {
        event = JSON.parse(rawBody);
        logger.warn('Dev mode - event parsed without signature verification');
      } catch (err) {
        logger.error('JSON parsing failed', err);
        return new Response(`Invalid JSON payload: ${err.message}`, { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate the event
    if (!event || !event.type) {
      logger.error('Invalid event structure');
      return new Response('Invalid event structure', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info(`Processing event: ${event.type} (${event.id})`);

    // Prepare data for database insertion
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

    // Extract relevant data based on event type
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
      logger.warn('Error extracting event data', extractError);
      // Continue with basic data
    }

    logger.info('Data to insert:', {
      type: eventData.event_type,
      email: eventData.customer_email,
      customer: eventData.customer_id
    });

    // Save the event to database
    try {
      const { data: webhookEvent, error: insertError } = await supabase
        .from('stripe_webhook_events')
        .insert(eventData)
        .select('id')
        .single();

      if (insertError) {
        logger.error('Database insertion error', insertError);
        return new Response(`Database error: ${insertError.message}`, { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      logger.success(`Event recorded with ID: ${webhookEvent.id}`);

      // Process the event based on type - SIMPLE VERSION
      let result = { success: true, message: 'Event recorded' };

      try {
        switch (event.type) {
          case 'checkout.session.completed':
            result = await handleCheckoutCompleted(event.data.object);
            break;
          default:
            logger.info(`Event type ${event.type} recorded but not processed`);
        }

        // Update event status
        await supabase
          .from('stripe_webhook_events')
          .update({ 
            status: result.success ? 'completed' : 'failed',
            error: result.success ? null : result.message
          })
          .eq('id', webhookEvent.id);

        logger.success(`Processing completed: ${result.message}`);

      } catch (processingError) {
        logger.error('Event processing error', processingError);
        
        // Update event status to failed
        await supabase
          .from('stripe_webhook_events')
          .update({ 
            status: 'failed',
            error: processingError.message
          })
          .eq('id', webhookEvent.id);
      }

      // Always return 200 to Stripe to prevent retries
      return new Response(JSON.stringify({ 
        received: true, 
        event_id: event.id,
        event_type: event.type,
        verified: isVerified
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (dbError) {
      logger.error('Database operation failed', dbError);
      return new Response(`Database operation failed: ${dbError.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    logger.error('Unhandled exception', err);
    return new Response(`Internal server error: ${err.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// SIMPLE checkout handler - CRÉE L'UTILISATEUR AUTH DIRECTEMENT
async function handleCheckoutCompleted(session) {
  logger.info('Processing checkout.session.completed');
  
  try {
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      throw new Error('Email missing in session');
    }

    logger.info(`Customer email: ${email}`);

    // Determine subscription type
    const subscriptionType = session.amount_total === 39900 ? 'yearly' : 
                           session.amount_total === 1299 ? 'discovery' : 'monthly';
    logger.info(`Subscription type: ${subscriptionType} (${session.amount_total})`);

    // CRÉER L'UTILISATEUR AUTH DIRECTEMENT
    try {
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          subscription_type: subscriptionType,
          created_via: 'stripe_webhook'
        }
      });
      
      if (createError) {
        logger.error('Error creating auth user', createError);
        throw new Error(`Auth user creation error: ${createError.message}`);
      }

      logger.success(`Auth user created: ${newAuthUser.user.id}`);

      // CRÉER LE PROFIL UTILISATEUR
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: newAuthUser.user.id,
          email,
          first_name: 'Nouvelle',
          last_name: 'Utilisatrice',
          phone: '+33612345678',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: 'active',
          subscription_type: subscriptionType,
          subscription_start_date: new Date().toISOString(),
          subscription_updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (profileError) {
        logger.error('Error creating profile', profileError);
        throw new Error(`Profile creation error: ${profileError.message}`);
      }

      logger.success(`Profile created: ${newProfile.id}`);

      // CRÉER LES REWARDS (SANS CONTRAINTE FK)
      try {
        await supabase
          .from('member_rewards')
          .insert({
            user_id: newProfile.id,
            points_earned: 0,
            points_spent: 0,
            points_balance: 0,
            tier_level: 'bronze'
          });
        logger.success('Member rewards created');
      } catch (rewardsError) {
        logger.warn('Rewards creation failed (non-critical)', rewardsError);
      }

      // ENVOYER EMAIL DE BIENVENUE
      await sendWelcomeEmail(email);

      return { success: true, message: `Complete user created for: ${email}` };

    } catch (authError) {
      logger.error('Auth user creation failed, using fallback', authError);
      
      // FALLBACK: Juste créer dans pending_signups
      const { data: pendingSignup, error: pendingError } = await supabase
        .from('pending_signups')
        .insert({
          email,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_type: subscriptionType,
          amount_paid: session.amount_total,
          status: 'pending'
        })
        .select('id')
        .single();

      if (pendingError) {
        throw new Error(`Pending signup error: ${pendingError.message}`);
      }

      logger.success(`Fallback: Pending signup created with ID: ${pendingSignup?.id}`);
      await sendWelcomeEmail(email);
      
      return { success: true, message: `Pending signup created for: ${email}` };
    }

  } catch (error) {
    logger.error('Error in handleCheckoutCompleted', error);
    return { success: false, message: error.message };
  }
}

async function sendWelcomeEmail(email) {
  try {
    logger.info(`Preparing welcome email for: ${email}`);
    
    // Add email to queue
    const { error: emailError } = await supabase
      .from('emails')
      .insert({
        to_address: email,
        subject: 'Bienvenue dans le Nowme Club ! 🎉',
        content: generateWelcomeEmailHTML(email),
        status: 'pending'
      });

    if (emailError) {
      throw new Error(`Email queue error: ${emailError.message}`);
    }

    logger.success('Welcome email added to queue');

  } catch (error) {
    logger.error('Email sending error', error);
    // Don't fail the webhook for email issues
  }
}

function generateWelcomeEmailHTML(email) {
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
    <h2 style="margin: 0 0 15px 0; font-size: 22px;">✨ Ton abonnement est activé !</h2>
    <p style="margin: 0; font-size: 16px;">Pour accéder à tous tes avantages, connecte-toi avec tes identifiants.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://club.nowme.fr/auth/signin" style="background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
      🔐 Me connecter maintenant
    </a>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0;">
    <h3 style="color: #BF2778; margin-top: 0;">📝 Tes identifiants :</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Email: ${email}</li>
      <li>Mot de passe: motdepasse123</li>
      <li>Tu pourras le changer une fois connectée</li>
    </ul>
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