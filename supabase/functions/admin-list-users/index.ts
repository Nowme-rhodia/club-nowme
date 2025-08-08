import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Basic auth check - implement proper authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Parse query parameters
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const perPage = parseInt(url.searchParams.get('per_page') || '50');
  const email = url.searchParams.get('email') || null;
  
  try {
    // Use direct database query to avoid Auth API issues
    let query = supabase
      .from('user_profiles')
      .select('user_id, email, first_name, last_name, subscription_status, created_at')
      .order('created_at', { ascending: false });
    
    if (email) {
      query = query.eq('email', email);
    }
    
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    const { data: users, error, count } = await query
      .range(from, to);
    
    if (error) {
      console.error('Error fetching users:', error);
      return new Response(JSON.stringify({ 
        error: error.message 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      users: users || [],
      page: page,
      per_page: perPage,
      total: count || 0
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ 
      error: err.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});