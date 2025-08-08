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
            first_name: 'Nouvelle',
            last_name: 'Utilisatrice',
            phone: '+33612345678',
          
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
        }
        )
        // Check if user already exists with this email - simple approach
        let existingUser = null;
        // Queue welcome email
        await supabase
          .from('emails')
          .insert({
            to_address: profile.email,
            subject: 'Bienvenue dans le Nowme Club ! 🎉',
            content: generateWelcomeEmailHTML(profile.email),
            status: 'pending',
            created_at: new Date().toISOString()
          });
        
        results.push({
          email: profile.email,
          status: status,
          user_id: userId,
          credentials_sent: true
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
});