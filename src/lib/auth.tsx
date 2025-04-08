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
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session);
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
      // Vérifier d'abord si c'est un partenaire
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (partnerData) {
        setProfile({ ...partnerData, role: 'partner' });
        return;
      }

      // Sinon vérifier le profil utilisateur
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

      if (error) throw error;

      // Redirection basée sur le rôle
      const { data: partnerData } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (partnerData) {
        navigate('/partner/dashboard');
      } else {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user?.id)
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
      console.error('Error:', error);
      toast.error('Email ou mot de passe incorrect');
      throw error; // Important: propager l'erreur pour la gestion dans le composant
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur est survenue lors de la déconnexion');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending reset password email to:', email);
      
      // Construire l'URL de redirection complète
      const redirectTo = import.meta.env.VITE_REDIRECT_URL;
      console.log('Redirect URL:', redirectTo);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
        // Forcer l'utilisation de l'URL de redirection
        emailRedirectTo: redirectTo
      });
      
      if (error) {
        console.error('Reset password error:', error);
        throw error;
      }
      
      console.log('Reset password email sent successfully');
      toast.success('Un email de réinitialisation vous a été envoyé');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Une erreur est survenue lors de l\'envoi de l\'email');
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      console.log('Updating password...');
      
      // Récupérer le hash de l'URL
      const hash = window.location.hash;
      console.log('Current URL hash:', hash);

      // Extraire le token d'accès
      const accessToken = hash.split('access_token=')[1]?.split('&')[0];
      console.log('Access token found:', !!accessToken);

      if (!accessToken) {
        throw new Error('Token de réinitialisation manquant');
      }

      // Mettre à jour la session avec le token
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: ''
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      // Mettre à jour le mot de passe
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error('Update password error:', error);
        throw error;
      }
      
      console.log('Password updated successfully');
      toast.success('Votre mot de passe a été mis à jour');

      // Rafraîchir la session
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        throw refreshError;
      }

    } catch (error) {
      console.error('Update password error:', error);
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