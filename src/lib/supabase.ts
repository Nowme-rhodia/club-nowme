import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';  // ✅ Correction de l'import

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⛔ Missing Supabase environment variables!');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper functions
export const auth = {
  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  signUp: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};
