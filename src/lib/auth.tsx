import { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  isAdmin: boolean;
  isPartner: boolean;
  isSubscriber: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (partnerData) {
        setProfile({ ...partnerData, role: 'partner' });
        return;
      }

      const { data: userData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userData) {
        setProfile({
          ...userData,
          role: userData.is_admin ? 'admin' : 'subscriber'
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user?.id || '')
        .single();

      if (partnerData) {
        navigate('/partner/dashboard');
      } else {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user?.id || '')
          .single();

        if (userData?.is_admin) {
          navigate('/admin');
        } else if (userData?.subscription_status === 'active') {
          navigate('/dashboard');
        } else {
          navigate('/subscription');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email ou mot de passe incorrect';
      toast.error(errorMessage);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      toast.error('Une erreur est survenue lors de la déconnexion');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });
      if (error) {
        if (error.message && error.message.includes('you can only request this after')) {
          throw error;
        } else {
          toast.error('Une erreur est survenue lors de l\'envoi de l\'email');
          throw error;
        }
      }
      toast.success('Un email de réinitialisation vous a été envoyé');
    } catch (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      // Extraction sécurisée des tokens
      const params = new URLSearchParams(window.location.hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        throw new Error('Tokens de réinitialisation manquants');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        throw sessionError;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      toast.success('Votre mot de passe a été mis à jour');

      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        throw refreshError;
      }

      setTimeout(() => {
        navigate('/auth/signin');
      }, 2000);

    } catch (error) {
      toast.error('Une erreur est survenue lors de la mise à jour du mot de passe');
      throw error;
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isPartner = profile?.role === 'partner';
  const isSubscriber = profile?.subscription_status === 'active';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      isAdmin,
      isPartner,
      isSubscriber
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}