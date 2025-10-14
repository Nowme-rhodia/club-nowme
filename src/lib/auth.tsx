// src/lib/auth.tsx — version robuste (stoppe les loadings infinis)
import { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type Role = 'admin' | 'partner' | 'subscriber' | 'guest';

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

  // ---- helpers ----
  const deriveRole = (profileRow: any, partnerRow: any): Role => {
    // Priorité admin > partner > subscriber > guest
    const adminish = [
      'admin',
      'super_admin',
      'subscriber_admin',
      'partner_admin',
    ];
    if (profileRow?.is_admin || adminish.includes(profileRow?.subscription_type)) {
      return 'admin';
    }
    if (partnerRow?.id) return 'partner';
    if (profileRow?.subscription_status === 'active') return 'subscriber';
    return 'guest';
  };

  const loadUserProfile = async (userId: string) => {
    try {
      // partners (maybeSingle = pas d’erreur si 0 ligne)
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id,is_active,user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (partnerError) console.warn('Partners warning:', partnerError.message);

      // user_profiles
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (userError) console.warn('User profile warning:', userError.message);

      const role = deriveRole(userData, partnerData);
      const merged = {
        ...(userData ?? {}),
        ...(partnerData ? { partner: partnerData } : {}),
        role,
      };
      setProfile(merged);
      console.log('Profile loaded with role:', role, merged);
    } catch (e) {
      console.error('loadUserProfile error:', e);
      setProfile(null);
    }
  };

  // ---- init + subscriptions ----
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadUserProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('Auth init error:', e);
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false); // ⬅️ clé pour stopper le spinner
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setLoading(true); // ⬅️ on relance un chargement contrôlé
          setUser(session?.user ?? null);

          if (event === 'PASSWORD_RECOVERY') {
            console.log('🔐 PASSWORD_RECOVERY détecté');
            toast.success('Lien validé, tu peux définir ton nouveau mot de passe ✨');
            navigate('/auth/update-password');
          }

          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error('onAuthStateChange error:', e);
          setProfile(null);
        } finally {
          setLoading(false); // ⬅️ on libère TOUJOURS
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // ---- actions ----
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !currentUser) throw getUserError || new Error("Impossible de récupérer l'utilisateur");

      // Petite logique de redirection simple (facultative, PrivateRoute gère aussi)
      const { data: partnerData } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (partnerData?.id) {
        navigate('/partner/dashboard');
        return;
      }

      const { data: userData } = await supabase
        .from('user_profiles')
        .select('is_admin,subscription_status')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (userData?.is_admin) {
        navigate('/admin');
      } else if (userData?.subscription_status === 'active') {
        navigate('/dashboard');
      } else {
        navigate('/subscription');
      }
    } catch (error) {
      toast.error('Email ou mot de passe incorrect');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/auth/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      toast.success('Lien envoyé par email');
    } catch (error) {
      toast.error("Impossible d'envoyer le lien");
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      if (tokenHash && type === 'recovery') {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (verifyError) throw verifyError;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Mot de passe mis à jour');
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ---- flags ----
  const role: Role = profile?.role ?? 'guest';
  const isAdmin = role === 'admin';
  const isPartner = role === 'partner';
  const isSubscriber = role === 'subscriber' || profile?.subscription_status === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        isAdmin,
        isPartner,
        isSubscriber,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
