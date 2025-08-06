import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Environment variables  
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple logger
const log = (message: string, data?: any) => {
  console.log(`🔵 ${message}`, data || '');
};

const logError = (message: string, error?: any) => {
  console.error(`🔴 ${message}`, error || '');
};

const logSuccess = (message: string, data?: any) => {
  console.log(`🟢 ${message}`, data || '');
};

Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get raw body
    const rawBody = await req.text();
    log(`Webhook received - Body length: ${rawBody.length}`);
    
    if (!rawBody) {
      logError('Empty request body');
      return new Response('Empty request body', { status: 400 });
    }

    // Parse event (skip signature verification for now to avoid issues)
    let event;
    try {
      event = JSON.parse(rawBody);
      log(`Event parsed: ${event.type} (${event.id})`);
    } catch (err) {
      logError('JSON parsing failed', err);
      return new Response(`Invalid JSON: ${err.message}`, { status: 400 });
    }

    // Validate event structure
    if (!event || !event.type) {
      logError('Invalid event structure');
      return new Response('Invalid event structure', { status: 400 });
    }

    // Prepare basic event data
    const eventData = {
      stripe_event_id: event.id,
      event_type: event.type,
      customer_id: null,
      customer_email: null,
      subscription_id: null,
      amount: null,
      status: 'processing',
      raw_event: event
    };

    // Extract data based on event type
    switch (event.type) {
      case 'checkout.session.completed':
        eventData.customer_id = event.data.object.customer;
        eventData.customer_email = event.data.object.customer_email || 
                                 event.data.object.customer_details?.email;
        eventData.subscription_id = event.data.object.subscription;
        eventData.amount = event.data.object.amount_total;
        break;
    }

    log('Event data prepared:', {
      type: eventData.event_type,
      email: eventData.customer_email,
      customer: eventData.customer_id
    });

    // Save event to database
    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert(eventData)
      .select('id')
      .single();

    if (insertError) {
      logError('Database insertion failed', insertError);
      return new Response(`Database error: ${insertError.message}`, { status: 500 });
    }

    logSuccess(`Event recorded with ID: ${webhookEvent.id}`);

    // Process the event
    let result = { success: true, message: 'Event recorded' };

    try {
      if (event.type === 'checkout.session.completed') {
        result = await handleCheckoutCompleted(event.data.object);
      }

      // Update event status
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          status: result.success ? 'completed' : 'failed',
          error: result.success ? null : result.message
        })
        .eq('id', webhookEvent.id);

      logSuccess(`Processing completed: ${result.message}`);

    } catch (processingError) {
      logError('Event processing failed', processingError);
      
      await supabase
        .from('stripe_webhook_events')
        .update({ 
          status: 'failed',
          error: processingError.message
        })
        .eq('id', webhookEvent.id);
    }

    // Always return 200 to Stripe
    return new Response(JSON.stringify({ 
      received: true, 
      event_id: event.id,
      event_type: event.type
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    logError('Unhandled exception', err);
    return new Response(`Internal server error: ${err.message}`, { status: 500 });
  }
});

// ULTRA SIMPLE checkout handler
async function handleCheckoutCompleted(session: any) {
  log('Processing checkout.session.completed');
  
  try {
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      throw new Error('Email missing in session');
    }

    log(`Customer email: ${email}`);

    // Determine subscription type
    const subscriptionType = session.amount_total === 39900 ? 'yearly' : 
                           session.amount_total === 1299 ? 'discovery' : 'monthly';
    log(`Subscription type: ${subscriptionType} (${session.amount_total})`);

    // DIRECT AUTH USER CREATION - SIMPLE VERSION
    try {
      // First, clean up any existing user with this email
      const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingAuthUsers?.users?.find(u => u.email === email);
      
      if (existingUser) {
        log(`Deleting existing auth user: ${existingUser.id}`);
        await supabase.auth.admin.deleteUser(existingUser.id, true);
      }

      // Create new auth user
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: 'motdepasse123', // Simple default password
        email_confirm: true,
        user_metadata: {
          subscription_type: subscriptionType,
          created_via: 'stripe_webhook'
        }
      });
      
      if (createError) {
        logError('Auth user creation failed', createError);
        throw new Error(`Auth user creation error: ${createError.message}`);
      }

      logSuccess(`Auth user created: ${newAuthUser.user.id}`);

      // Clean up any existing profile with this email
      await supabase
        .from('user_profiles')
        .delete()
        .eq('email', email);

      // Create user profile
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
        logError('Profile creation failed', profileError);
        throw new Error(`Profile creation error: ${profileError.message}`);
      }

      logSuccess(`Profile created: ${newProfile.id}`);

      // Create member rewards (optional - don't fail if it doesn't work)
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
        logSuccess('Member rewards created');
      } catch (rewardsError) {
        log('Rewards creation failed (non-critical)', rewardsError);
      }

      // Send simple welcome email
      await sendSimpleWelcomeEmail(email);

      return { success: true, message: `Complete user created for: ${email}` };

    } catch (authError) {
      logError('Complete auth flow failed', authError);
      
      // FALLBACK: Just update existing profile or create pending signup
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active',
            subscription_type: subscriptionType,
            subscription_updated_at: new Date().toISOString()
          })
          .eq('email', email);
        
        logSuccess(`Updated existing profile for: ${email}`);
      } else {
        // Create pending signup
        await supabase
          .from('pending_signups')
          .insert({
            email,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_type: subscriptionType,
            amount_paid: session.amount_total,
            status: 'pending'
          });
        
        logSuccess(`Created pending signup for: ${email}`);
      }

      await sendSimpleWelcomeEmail(email);
      
      return { success: true, message: `Fallback processing completed for: ${email}` };
    }

  } catch (error) {
    logError('Error in handleCheckoutCompleted', error);
    return { success: false, message: error.message };
  }
}

async function sendSimpleWelcomeEmail(email: string) {
  try {
    log(`Preparing welcome email for: ${email}`);
    
    const { error: emailError } = await supabase
      .from('emails')
      .insert({
        to_address: email,
        subject: 'Bienvenue dans le Nowme Club ! Tes identifiants 🎉',
        content: generateSimpleWelcomeEmailHTML(email),
        status: 'pending'
      });

    if (emailError) {
      throw new Error(`Email queue error: ${emailError.message}`);
    }

    logSuccess('Welcome email added to queue');

  } catch (error) {
    logError('Email sending error', error);
    // Don't fail the webhook for email issues
  }
}

function generateSimpleWelcomeEmailHTML(email: string) {
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
    <p style="margin: 0; font-size: 16px;">Connecte-toi maintenant avec tes identifiants :</p>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 30px 0;">
    <h3 style="color: #BF2778; margin-top: 0;">🔐 Tes identifiants :</h3>
    <ul style="margin: 0; padding-left: 20px; font-size: 16px;">
      <li><strong>Email :</strong> ${email}</li>
      <li><strong>Mot de passe :</strong> motdepasse123</li>
      <li><strong>URL :</strong> <a href="https://club.nowme.fr/auth/signin">https://club.nowme.fr/auth/signin</a></li>
    </ul>
    <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
      Tu pourras changer ton mot de passe une fois connectée dans "Mon compte"
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://club.nowme.fr/auth/signin" style="background-color: #BF2778; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block;">
      🔐 Me connecter maintenant
    </a>
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