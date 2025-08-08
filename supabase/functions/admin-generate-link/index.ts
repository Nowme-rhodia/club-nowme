import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Email is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user exists - simple approach
    let userExists = false;
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
      userExists = !userError && userData?.user;
    } catch (err) {
      console.log(`Could not check user existence: ${err.message}`);
    }
    
    if (!userExists) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: `User with email ${email} not found`
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate recovery link
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });
    
    if (resetError) {
      console.error('Error generating link:', resetError);
      
      // If the standard method fails, try a direct password reset as fallback
      try {
        const { error: resetPasswordError } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: 'https://club.nowme.fr/auth/update-password' }
        );
        
        if (resetPasswordError) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `Failed to generate link: ${resetError.message}. Fallback also failed: ${resetPasswordError.message}`
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Password reset email sent directly to user',
          directEmail: true
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (fallbackErr) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: `Failed to generate link: ${resetError.message}. Fallback also failed: ${fallbackErr.message}`
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      link: resetData.properties.action_link
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ 
      success: false, 
      message: err.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});