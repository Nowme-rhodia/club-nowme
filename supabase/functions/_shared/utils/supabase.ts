// File: supabase/functions/_shared/utils/supabase.ts

import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(authHeader?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  // Use service role key by default for server-side operations
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const options = authHeader ? {
    global: {
      headers: { Authorization: authHeader }
    }
  } : undefined;
  
  return createClient(supabaseUrl, supabaseKey, options);
}

export function createSupabaseClientWithAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  
  return createSupabaseClient(authHeader);
}