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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    let event;
    
    // Verify webhook signature if secret is available
    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
      }
    } else {
      // Fall back to JSON parsing if no signature verification
      try {
        event = JSON.parse(rawBody);
      } catch (err) {
        return new Response(`Invalid JSON: ${err.message}`, { status: 400 });
      }
    }

    // Extract customer email from the event
    const customerEmail = event.data?.object?.customer_email || 
                         (event.data?.object?.customer ? await getCustomerEmail(event.data.object.customer) : null);
    
    // Save event to database with error handling
    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        customer_email: customerEmail,
        status: 'processing',
        raw_event: event
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`Database error saving webhook: ${insertError.message}`);
      return new Response(`Database error: ${insertError.message}`, { status: 500 });
    }

    // Process checkout.session.completed with error handling
    if (event.type === 'checkout.session.completed') {
      try {
        await handleCheckoutCompleted(event.data.object);
        
        // Update webhook status to completed
        await supabase
          .from('stripe_webhook_events')
          .update({ status: 'completed' })
          .eq('id', webhookEvent.id);
          
      } catch (err) {
        console.error(`Error processing checkout: ${err.message}`);
        
        // Update webhook status to failed with error message
        await supabase
          .from('stripe_webhook_events')
          .update({ 
            status: 'failed',
            error_message: err.message
          })
          .eq('id', webhookEvent.id);
          
        // Still return 200 to Stripe to prevent retries
        return new Response(JSON.stringify({ 
          received: true,
          processed: false,
          error: err.message
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ 
      received: true,
      processed: true,
      webhookId: webhookEvent.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`Webhook processing error: ${err.message}`);
    return new Response(`Internal server error: ${err.message}`, { status: 500 });
  }
});

// Helper function to get customer email if not directly available
async function getCustomerEmail(customerId) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer.email;
  } catch (err) {
    console.error(`Error retrieving customer: ${err.message}`);
    return null;
  }
}

async function handleCheckoutCompleted(session) {
  const email = session.customer_email;
  if (!email) {
    throw new Error('Customer email not found in checkout session');
  }
  
  // Check if user already exists - simple approach
  let existingUser = null;
  try {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    if (!userError && userData?.user) {
      existingUser = userData.user;
    }
  } catch (err) {
    console.log(`Could not check existing user: ${err.message}`);
  }
  
  let userId;
  
  // Create user if doesn't exist
  if (!existingUser) {
    // Generate a secure random password
    const tempPassword = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    
    const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });
    
    if (createError) {
      console.error(`Error creating user: ${createError.message}`);
      throw createError;
    }
    
    userId = newAuthUser.user.id;
    
    console.log(`Created new user with ID: ${userId}`);
  } else {
    userId = existingUser.id;
    console.log(`Using existing user with ID: ${userId}`);
  }
  
  // Check if profile exists
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (profileLookupError) {
    console.error(`Error looking up profile: ${profileLookupError.message}`);
    throw profileLookupError;
  }
  
  // Create or update user profile
  if (!existingProfile) {
    // Create new profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        email,
        first_name: 'Nouvelle',
        last_name: 'Utilisatrice',
        phone: '+33612345678',
        subscription_status: 'active',
        subscription_type: session.metadata?.plan || 'premium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (profileError) {
      console.error(`Error creating profile: ${profileError.message}`);
      throw profileError;
    }
    
    console.log(`Created new profile for user: ${userId}`);
  } else {
    // Update existing profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'active',
        subscription_type: session.metadata?.plan || 'premium',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error(`Error updating profile: ${updateError.message}`);
      throw updateError;
    }
    
    console.log(`Updated profile for user: ${userId}`);
  }
  
  // Send welcome email with simple credentials
  const { error: emailError } = await supabase
    .from('emails')
    .insert({
      to_address: email,
      subject: 'Bienvenue dans le Nowme Club ! 🎉',
      content: generateWelcomeEmailHTML(email),
      status: 'pending'
    });
    
  if (emailError) {
    console.error(`Error queueing email: ${emailError.message}`);
  }
  
  // Generate password reset link
  try {
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });
    
    if (!resetError && resetData) {
      const resetLink = resetData.properties.action_link;
      
      // Send welcome email with login instructions
      const emailContent = `Welcome to Nowme Club! Your account is ready. Please set your password using this link: ${resetLink}`;
        
      const { error: emailError } = await supabase
        .from('emails')
        .insert({
          to_address: email,
          subject: 'Welcome to Nowme Club!',
          content: emailContent,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
      if (emailError) {
        console.error(`Error queueing email: ${emailError.message}`);
      }
    } else {
      // Fallback to a generic welcome email
      const { error: emailError } = await supabase
        .from('emails')
        .insert({
          to_address: email,
          subject: 'Welcome to Nowme Club!',
          content: 'Welcome to Nowme Club! Your account is ready. Please use the "Forgot Password" option to set your password.',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
      if (emailError) {
        console.error(`Error queueing email: ${emailError.message}`);
      }
    }
  } catch (err) {
    console.error(`Error with password reset: ${err.message}`);
  }
  
  return { userId, email };
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