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