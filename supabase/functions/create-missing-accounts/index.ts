import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// This function is for admin use only - requires service role key
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Basic auth check - you should implement proper authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    // Find all profiles without auth users
    const { data: orphanedProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, subscription_status, subscription_type')
      .is('user_id', null)
      .eq('subscription_status', 'active');
      
    if (profileError) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Error fetching orphaned profiles: ${profileError.message}`
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!orphanedProfiles || orphanedProfiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No orphaned profiles found'
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const results = [];
    
    // Process each orphaned profile
    for (const profile of orphanedProfiles) {
      try {
        // Check if user already exists with this email using our safe function
        const { data: existingUsers, error: lookupError } = await supabase.rpc('safe_get_user_by_email', {
          p_email: profile.email
        });
        
        if (lookupError) {
          results.push({
            email: profile.email,
            status: 'error',
            error: lookupError.message
          });
          continue;
        }
        
        let userId;
        let status = 'created';
        
        if (existingUser) {
          // User exists, use existing ID
          userId = existingUser.id;
          status = 'linked_existing';
        } else {
          // Create new auth user
          const tempPassword = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
          
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: profile.email,
            password: tempPassword,
            email_confirm: true
          });
          
          if (createError) {
            results.push({
              email: profile.email,
              status: 'error',
              error: createError.message
            });
            continue;
          }
          
          userId = newUser.user.id;
        }
        
        // Update profile with user_id
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ user_id: userId })
          .eq('id', profile.id);
          
        if (updateError) {
          results.push({
            email: profile.email,
            status: 'error',
            error: updateError.message
          });
          continue;
        }
        
        // Generate password reset link
        const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        // Check if user already exists with this email - simple approach
        let existingUser = null;
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(profile.email);
          if (!userError && userData?.user) {
            existingUser = userData.user;
          }
        } catch (err) {
          console.log(`Could not check existing user: ${err.message}`);
        }
        
        let resetLink = null;
        if (!resetError && resetData) {
          resetLink = resetData.properties.action_link;
        }
        
        // Queue welcome email
        const emailContent = resetLink 
          ? `Welcome to Nowme Club! Your account is now ready. Please set your password using this link: ${resetLink}`
          : `Welcome to Nowme Club! Your account is now ready. Please use the "Forgot Password" option to set your password.`;
          
        await supabase
          .from('emails')
          .insert({
            to_address: profile.email,
            subject: 'Your Nowme Club Account is Ready',
            content: emailContent,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        
        results.push({
          email: profile.email,
          status: status,
          user_id: userId,
          reset_link: resetLink ? true : false
        });
        
      } catch (err) {
        results.push({
          email: profile.email,
          status: 'error',
          error: err.message
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results: results
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: err.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});