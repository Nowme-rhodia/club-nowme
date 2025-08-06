# Supabase Support Request - Critical Issues with Edge Functions and Auth Flow

## Project Information
- **Project ID**: `dqfyuhwrjozoxadkccdj`
- **Project URL**: https://dqfyuhwrjozoxadkccdj.supabase.co
- **Application**: Nowme Club (subscription-based platform)
- **Issue Type**: Edge Function deployment failures + Auth API inconsistencies

## Summary
We're experiencing multiple critical issues that are blocking our production deployment:

1. **Edge Function deployment failures** with parsing errors
2. **Auth API inconsistencies** with `admin/generate_link` and `admin/users` endpoints
3. **Database constraint conflicts** preventing user creation
4. **Webhook processing failures** affecting subscription flow

## Issue 1: Edge Function Deployment Failures

### Error Details
```
Function name: stripe-webhook
Error message: Failed to deploy edge function: Supabase API error, 400, failed to create the graph

Caused by:
    The module's source code could not be parsed: Expression expected at file:///tmp/user_fn_dqfyuhwrjozoxadkccdj_61da3804-c318-4739-94f5-50226eec817e_363/source/index.ts:485:2
    
      });
       ~
```

### Current Edge Function Code
```typescript
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
        password: 'motdepasse123', // Mot de passe par défaut
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

      // ENVOYER EMAIL SIMPLE AVEC IDENTIFIANTS
      await sendSimpleWelcomeEmail(email);

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
      await sendSimpleWelcomeEmail(email);
      
      return { success: true, message: `Pending signup created for: ${email}` };
    }

  } catch (error) {
    logger.error('Error in handleCheckoutCompleted', error);
    return { success: false, message: error.message };
  }
}

async function sendSimpleWelcomeEmail(email) {
  try {
    logger.info(`Preparing simple welcome email for: ${email}`);
    
    // Add email to queue with simple credentials
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

    logger.success('Simple welcome email added to queue');

  } catch (error) {
    logger.error('Email sending error', error);
    // Don't fail the webhook for email issues
  }
}

function generateSimpleWelcomeEmailHTML(email) {
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
```

### Problem Analysis
The parsing error suggests there's a syntax issue around line 485, but the exact location is unclear. The error mentions an unexpected `});` which could be:
- Missing opening brace
- Extra closing brace
- Incorrect nesting of functions/objects

## Issue 2: Auth API Inconsistencies

### Error Logs
```json
{
  "error": "404: User with this email not found",
  "path": "/admin/generate_link",
  "status": 404,
  "timestamp": 1754485375000000
}

{
  "error": "unable to fetch records: sql: Scan error on column index 3, name \"confirmation_token\": converting NULL to string is unsupported",
  "path": "/admin/users",
  "status": 500,
  "timestamp": 1754484993000000
}
```

### Current admin-generate-link Function Code
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const adminSecret = Deno.env.get('ADMIN_SECRET') || 'default-secret-change-me';

// Initialize Supabase client with service role key
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
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Parse request body
    const { email, secret } = await req.json();
    
    // Validate inputs
    if (!email) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Email is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate admin secret
    if (secret !== adminSecret) {
      logger.warn(`Invalid admin secret attempt for email: ${email}`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Invalid admin secret' 
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info(`Processing link generation for: ${email}`);
    
    // Check if user exists in auth.users using listUsers without filter
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Get more users to search through
    });
    
    const authUserExists = existingAuthUsers?.users && 
                          existingAuthUsers.users.some(user => user.email === email);
    
    // Check if user exists in user_profiles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, email, user_id, subscription_status, subscription_type')
      .eq('email', email)
      .maybeSingle();
      
    // Check if user exists in pending_signups
    const { data: pendingSignup } = await supabase
      .from('pending_signups')
      .select('id, email, stripe_customer_id, stripe_subscription_id, subscription_type')
      .eq('email', email)
      .maybeSingle();
    
    logger.info(`User status for ${email}:`, {
      authUserExists,
      hasProfile: !!userProfile,
      hasPendingSignup: !!pendingSignup
    });
    
    // If user doesn't exist in auth.users but exists in user_profiles or pending_signups
    if (!authUserExists && (userProfile || pendingSignup)) {
      logger.info(`User ${email} needs account creation - generating signup link`);
      
      // Create auth user first
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          subscription_type: userProfile?.subscription_type || pendingSignup?.subscription_type || 'discovery',
          created_via: 'admin_link_generation'
        }
      });
      
      if (createError) {
        logger.error(`Error creating auth user for ${email}`, createError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: `Error creating auth user: ${createError.message}` 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      logger.success(`Auth user created for ${email}: ${newAuthUser.user.id}`);
      
      // Update user_profile with real user_id if it exists
      if (userProfile && !userProfile.user_id) {
        const { error: linkError } = await supabase
          .from('user_profiles')
          .update({ user_id: newAuthUser.user.id })
          .eq('email', email);
          
        if (linkError) {
          logger.warn(`Could not link profile to auth user for ${email}`, linkError);
        } else {
          logger.success(`Linked profile to auth user for ${email}`);
        }
      }
      
      // Generate password setup link
      const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: 'https://club.nowme.fr/auth/update-password'
        }
      });
      
      if (resetError) {
        logger.error(`Error generating password setup link for ${email}`, resetError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: `Error generating password setup link: ${resetError.message}` 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Store the link in auth_links table
      const { error: linkStoreError } = await supabase
        .from('auth_links')
        .insert({
          email,
          link_type: 'recovery',
          action_link: resetData.properties.action_link,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
        });
        
      if (linkStoreError) {
        logger.warn(`Could not store link for ${email}`, linkStoreError);
      }
      
      logger.success(`Password setup link generated for ${email}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Auth user created and password setup link generated',
        action: 'password_setup',
        link: resetData.properties.action_link,
        userId: newAuthUser.user.id
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If user exists in auth.users, generate a password reset link
    else if (authUserExists) {
      logger.info(`User ${email} exists in auth.users - generating password reset link`);
      
      const authUser = existingAuthUsers.users.find(user => user.email === email);
      
      // Generate a password reset link
      const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: 'https://club.nowme.fr/auth/update-password'
        }
      });
      
      if (resetError) {
        logger.error(`Error generating password reset link for ${email}`, resetError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: `Error generating password reset link: ${resetError.message}` 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Store the link in auth_links table
      const { error: linkStoreError } = await supabase
        .from('auth_links')
        .insert({
          email,
          link_type: 'recovery',
          action_link: resetData.properties.action_link,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
        });
        
      if (linkStoreError) {
        logger.warn(`Could not store link for ${email}`, linkStoreError);
      }
      
      logger.success(`Password reset link generated for ${email}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Password reset link generated',
        action: 'recovery',
        link: resetData.properties.action_link,
        userId: authUser.id
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If user doesn't exist anywhere
    else {
      logger.warn(`User ${email} not found in any table`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'User with this email not found in any table' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (err) {
    logger.error('Unhandled exception', err);
    return new Response(JSON.stringify({ 
      success: false, 
      message: `Internal server error: ${err.message}` 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### Problems with Auth API
1. **`/admin/users` endpoint returns 500** with SQL scan error on `confirmation_token` field
2. **`/admin/generate_link` consistently returns 404** even when user exists in database
3. **`listUsers()` method seems to have issues** with filtering or pagination

## Issue 3: Database Schema Conflicts

### Error Details
```sql
ERROR: 23505: duplicate key value violates unique constraint "user_profiles_user_id_key"
DETAIL: Key (user_id)=(d8eefd40-5e47-40c3-882f-cb97446259ee) already exists.
```

### Database Schema Issues
- **Foreign key constraints** between `user_profiles.user_id` and `auth.users.id` are causing conflicts
- **Unique constraints** preventing proper user creation flow
- **Member rewards table** has FK constraints that fail when users are created

## Issue 4: Complete User Flow Breakdown

### Expected Flow
1. User subscribes via Stripe → `checkout.session.completed` webhook
2. Webhook creates user in `auth.users` + `user_profiles` + `member_rewards`
3. Welcome email sent with login credentials
4. User can login immediately

### Current Broken Flow
1. ✅ Stripe webhook received and logged
2. ✅ `user_profiles` record created/updated
3. ✅ Email queued and sent
4. ❌ **No user created in `auth.users`**
5. ❌ **`admin/generate_link` fails with 404**
6. ❌ **User cannot login**

## Recent Error Logs Analysis

### Webhook Processing (Working)
```
POST | 201 | stripe_webhook_events | 200 OK
PATCH | 204 | user_profiles | 200 OK  
POST | 201 | emails | 200 OK
```

### Auth API Failures (Broken)
```
GET | 500 | /auth/v1/admin/users | SQL scan error on confirmation_token
POST | 404 | /auth/v1/admin/generate_link | User not found
```

### Email Processing (Working)
```
GET | 200 | emails?status=eq.pending | 200 OK
PATCH | 204 | emails | 200 OK (status updated to sent)
POST | 201 | email_logs | 200 OK
```

## Database State Verification

Please help us verify the current state with these queries:

```sql
-- Check if test user exists in any table
SELECT 'user_profiles' as source, email, user_id, subscription_status 
FROM user_profiles WHERE email = 'test-flow@nowme.fr'
UNION ALL
SELECT 'pending_signups' as source, email, 'N/A' as user_id, status as subscription_status 
FROM pending_signups WHERE email = 'test-flow@nowme.fr';

-- Check auth.users table structure and recent users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for schema issues with confirmation_token
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users' 
AND column_name = 'confirmation_token';
```

## Environment Configuration

### Edge Function Environment Variables
- `SUPABASE_URL`: ✅ Set
- `SUPABASE_SERVICE_ROLE_KEY`: ✅ Set  
- `STRIPE_SECRET_KEY`: ✅ Set
- `STRIPE_WEBHOOK_SECRET`: ✅ Set
- `RESEND_API_KEY`: ✅ Set

### Project Configuration
- **Project ID**: dqfyuhwrjozoxadkccdj
- **Region**: eu-west-1
- **Postgres Version**: 15
- **API Version**: Latest

## Requested Support

1. **Help diagnose the Edge Function parsing error** - What's causing the syntax error at line 485?

2. **Investigate Auth API inconsistencies** - Why are `/admin/users` and `/admin/generate_link` failing?

3. **Database schema guidance** - How to properly handle the user creation flow with FK constraints?

4. **Alternative approaches** - If current approach is flawed, what's the recommended pattern for Stripe webhook → user creation flow?

## Urgency Level
**HIGH** - This is blocking our production launch and affecting user onboarding. We've been stuck on this for several days and need immediate assistance.

## Additional Context
- This is a subscription-based platform where users pay via Stripe and get access to exclusive content
- The webhook needs to create complete user accounts (auth + profile + rewards) automatically
- We're using the latest versions of Supabase JS SDK and Stripe SDK
- The application is deployed on Netlify with Supabase as backend

Thank you for your assistance. Please let us know if you need any additional information or access to investigate these issues.