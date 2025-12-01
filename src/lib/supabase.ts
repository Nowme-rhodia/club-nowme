// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⛔️ Variables Supabase manquantes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

// Session par onglet: déconnexion à la fermeture
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,       // persiste dans sessionStorage (pas localStorage)
    autoRefreshToken: true,     // peut être mis à false si tu veux éviter tout refresh
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-client-info': 'nowme-web' },
  },
})

// Nettoyage des anciennes sessions en localStorage (une fois)
if (typeof window !== 'undefined') {
  try {
    const keys = Object.keys(window.localStorage)
    for (const k of keys) {
      if (k.startsWith('sb-')) window.localStorage.removeItem(k)
    }
  } catch {
    // no-op
  }
}

export const auth = {
  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  signUp: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}