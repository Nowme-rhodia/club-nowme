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

      // Process the event based on type
      let result = { success: true, message: 'Event recorded' };

      try {
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

// Event handler functions
async function handleInvoicePaymentSucceeded(invoice) {
  logger.info('Processing invoice.payment_succeeded');
  
  try {
    const email = invoice.customer_email;
    if (!email) {
      logger.warn('No email in invoice');
      return { success: true, message: 'Invoice without email, ignored' };
    }

    // Update payment status
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'active',
        subscription_updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (error) {
      logger.error('Error updating payment status', error);
      return { success: false, message: `Update error: ${error.message}` };
    }

    logger.success(`Payment confirmed for: ${email}`);
    return { success: true, message: `Payment confirmed for ${email}` };
  } catch (error) {
    logger.error('Error in handleInvoicePaymentSucceeded', error);
    return { success: false, message: error.message };
  }
}

async function handleCheckoutCompleted(session) {
  logger.info('Processing checkout.session.completed');
  
  try {
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      throw new Error('Email missing in session');
    }

    logger.info(`Customer email: ${email}`);
    logger.info(`Session data:`, {
      customer: session.customer,
      subscription: session.subscription,
      amount_total: session.amount_total
    });


    // Determine subscription type
    const subscriptionType = session.amount_total === 39900 ? 'yearly' : 
                           session.amount_total === 1299 ? 'discovery' : 'monthly';
    logger.info(`Subscription type: ${subscriptionType} (${session.amount_total})`);

    // Use UPSERT approach with ON CONFLICT
    logger.info('Creating or updating user profile with UPSERT');
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: crypto.randomUUID(), // Temporary UUID, will be updated on signup
        email,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
        subscription_type: subscriptionType,
        subscription_start_date: new Date().toISOString(),
        subscription_updated_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (profileError) {
      logger.error('Profile upsert failed', profileError);
      throw new Error(`Profile upsert error: ${profileError.message}`);
    }

    logger.success(`Profile created/updated: ${profile.id}`);

    // Create member_rewards if it doesn't exist
    try {
      const { error: rewardsError } = await supabase
        .from('member_rewards')
        .upsert({
          user_id: profile.id,
          points_earned: 0,
          points_spent: 0,
          points_balance: 0,
          tier_level: 'bronze'
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        });

      if (rewardsError) {
        logger.error('Member rewards upsert failed', rewardsError);
      } else {
        logger.success('Member rewards created/updated');
      }
    } catch (rewardsError) {
      logger.error('Member rewards exception', rewardsError);
      // Continue even if rewards creation fails
    }

    // Send signup instruction email
    await sendSignupInstructionEmail(email);

    return { success: true, message: `Profile processed for ${email} - signup email sent` };
  } catch (error) {
    logger.error('Error in handleCheckoutCompleted', error);
    return { success: false, message: error.message };
  }
}

async function handleSubscriptionUpdated(subscription) {
  logger.info('Processing subscription.updated');
  
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
      throw new Error(`Update error: ${error.message}`);
    }

    return { success: true, message: `Subscription updated: ${status}` };
  } catch (error) {
    logger.error('Error in handleSubscriptionUpdated', error);
    return { success: false, message: error.message };
  }
}

async function handleSubscriptionDeleted(subscription) {
  logger.info('Processing subscription.deleted');
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'cancelled',
        subscription_updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', subscription.customer);

    if (error) {
      throw new Error(`Cancellation error: ${error.message}`);
    }

    return { success: true, message: 'Subscription cancelled' };
  } catch (error) {
    logger.error('Error in handleSubscriptionDeleted', error);
    return { success: false, message: error.message };
  }
}

async function handlePaymentFailed(invoice) {
  logger.info('Processing payment.failed');
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'past_due',
        subscription_updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', invoice.customer);

    if (error) {
      throw new Error(`Failed payment update error: ${error.message}`);
    }

    return { success: true, message: 'Payment status updated' };
  } catch (error) {
    logger.error('Error in handlePaymentFailed', error);
    return { success: false, message: error.message };
  }
}

async function sendWelcomeEmail(email) {
  try {
    logger.info(`Preparing welcome email for: ${email}`);
    
    // Generate password reset link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });

    if (linkError) {
      throw new Error(`Link generation error: ${linkError.message}`);
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      throw new Error('Reset link not generated');
    }

    logger.info('Link generated, adding to email queue');

    // Add email to queue
    const { error: emailError } = await supabase
      .from('emails')
      .insert({
        to_address: email,
        subject: 'Bienvenue dans le Nowme Club ! 🎉',
        content: generateWelcomeEmailHTML(email, resetLink),
        status: 'pending'
      });

    if (emailError) {
      throw new Error(`Email queue error: ${emailError.message}`);
    }

    logger.success('Email added to queue');

  } catch (error) {
    logger.error('Email sending error', error);
    // Don't fail the webhook for email issues
  }
}

async function sendSignupInstructionEmail(email) {
  try {
    logger.info(`Preparing signup instruction email for: ${email}`);
    
    // Generate password reset link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });

    if (linkError) {
      throw new Error(`Link generation error: ${linkError.message}`);
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      throw new Error('Reset link not generated');
    }

    logger.info('Password reset link generated successfully');

    // Add email to queue with the actual reset link
    const { error: emailError } = await supabase
      .from('emails')
      .insert({
        to_address: email,
        subject: 'Ton abonnement Nowme est activé ! Crée ton compte 🎉',
        content: generateSignupInstructionHTML(email, resetLink),
        status: 'pending'
      });

    if (emailError) {
      throw new Error(`Email queue error: ${emailError.message}`);
    }

    logger.success('Signup instruction email added to queue');

  } catch (error) {
    logger.error('Email sending error', error);
    // Don't fail the webhook for email issues
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

function generateSignupInstructionHTML(email, resetLink) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ton abonnement Nowme est activé !</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #BF2778; font-size: 28px; margin-bottom: 10px;">🎉 Ton abonnement est activé !</h1>
    <p style="font-size: 18px; color: #666;">Bienvenue dans le Nowme Club !</p>
  </div>

  <div style="background: linear-gradient(135deg, #BF2778, #E4D44C); color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
    <h2 style="margin: 0 0 15px 0; font-size: 22px;">✨ Ton paiement est confirmé !</h2>
    <p style="margin: 0; font-size: 16px;">Il ne reste qu'à créer ton compte pour accéder à tous tes avantages.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
      🚀 Créer mon compte
    </a>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0;">
    <h3 style="color: #BF2778; margin-top: 0;">📝 Comment faire :</h3>
    <ol style="margin: 0; padding-left: 20px;">
      <li>Clique sur le lien "Créer mon compte" ci-dessus</li>
      <li>Tu seras redirigée vers la page de création de mot de passe</li>
      <li>Choisis un mot de passe sécurisé (minimum 8 caractères)</li>
      <li>Commence à kiffer ! 🎯</li>
    </ol>
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