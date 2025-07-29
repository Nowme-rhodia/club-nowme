// auth.tsx - Version mise à jour pour le nouveau flux d'authentification
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
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (partnerError && partnerError.code !== 'PGRST116') {
        console.error('Error checking partner data:', partnerError);
      }

      if (partnerData) {
        setProfile({ ...partnerData, role: 'partner' });
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error loading user profile:', userError);
      }

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // Récupérer immédiatement les informations de l'utilisateur connecté
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError || !currentUser) {
        throw getUserError || new Error("Impossible de récupérer l'utilisateur connecté");
      }

      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (partnerError && partnerError.code !== 'PGRST116') {
        console.error('Error checking partner data:', partnerError);
      }

      if (partnerData) {
        navigate('/partner/dashboard');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error loading user profile:', userError);
      }

      if (userData?.is_admin) {
        navigate('/admin');
      } else if (userData?.subscription_status === 'active') {
        navigate('/dashboard');
      } else {
        navigate('/subscription');
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
      // Utiliser le nouveau format d'URL avec les paramètres de requête au lieu des fragments
      const redirectTo = `${window.location.origin}/auth/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        if (error.message.includes('you can only request this after')) {
          throw error;
        } else {
          toast.error("Une erreur est survenue lors de l'envoi de l'email");
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
      // Cette méthode fonctionne avec les deux formats d'URL (fragments ou paramètres de requête)
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isPartner = profile?.role === 'partner';
  const isSubscriber = profile?.subscription_status === 'active' || profile?.role === 'subscriber';

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