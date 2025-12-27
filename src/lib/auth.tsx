import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { logger } from './logger';
import toast from 'react-hot-toast';

type Role = 'admin' | 'partner' | 'subscriber' | 'guest';

interface UserProfile {
  id?: string;
  user_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  phone?: string;
  birth_date?: string;
  acquisition_source?: string;
  signup_goal?: string;
  subscription_status?: string;
  subscription_type?: string;
  stripe_customer_id?: string;
  is_admin?: boolean;
  partner_id?: string;
  role?: Role;
  created_at?: string;
  updated_at?: string;
  partner?: {
    id: string;
    user_id: string;
    status: string;
  };
  subscription?: {
    id: string;
    user_id: string;
    status: string;
    stripe_subscription_id: string;
    current_period_end: string;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  isSubscriber: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCache, setProfileCache] = useState<{ userId: string; profile: UserProfile; timestamp: number } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null); // Pour éviter les appels simultanés
  const navigate = useNavigate();

  // Durée du cache : 20 minutes
  const CACHE_DURATION = 20 * 60 * 1000;

  const deriveRole = (profileRow: any, partnerRow: any, subscriptionRow: any): Role => {
    // Log pour débugger la détection
    // console.log('🔍 deriveRole - Checking:', { 
    //   partner_id: profileRow?.partner_id, 
    //   is_admin: profileRow?.is_admin,
    //   sub_status: subscriptionRow?.status 
    // });

    const adminish = [
      'admin',
      'super_admin',
      'partner_admin',
    ];

    // Priority 1: Admin
    if (profileRow?.is_admin === true || adminish.includes(profileRow?.subscription_type)) {
      return 'admin';
    }

    // Priority 2: Partner (Check partner_id explicitly)
    if (profileRow?.partner_id) {
      return 'partner';
    }

    // Fallback: Check standard partner table if available (legacy compatibility)
    if (partnerRow?.id) {
      return 'partner';
    }

    // Priority 3: Subscriber
    if (subscriptionRow?.status === 'active' || subscriptionRow?.status === 'trialing') {
      return 'subscriber';
    }

    return 'guest';
  };

  const loadUserProfile = async (userId: string, forceRefresh: boolean = false) => {
    try {
      const timestamp = Date.now();

      // Vérifier si un chargement est déjà en cours pour cet utilisateur
      if (loadingProfile === userId && !forceRefresh) {
        console.log('⏸️ loadUserProfile - Already loading profile for userId:', userId);
        return;
      }

      // Vérifier le cache mémoire si pas de forceRefresh
      if (!forceRefresh && profileCache && profileCache.userId === userId) {
        const cacheAge = timestamp - profileCache.timestamp;
        if (cacheAge < CACHE_DURATION) {
          console.log('✅ loadUserProfile - Using memory cached profile (age:', Math.round(cacheAge / 1000), 'seconds)');
          setProfile(profileCache.profile);
          return;
        } else {
          console.log('⏰ loadUserProfile - Memory cache expired (age:', Math.round(cacheAge / 1000), 'seconds)');
        }
      }

      // Vérifier le cache localStorage en priorité
      if (!forceRefresh) {
        try {
          const localCache = localStorage.getItem('nowme_profile_cache');
          if (localCache) {
            const { userId: cachedUserId, profile: cachedProfile, timestamp: cachedTimestamp } = JSON.parse(localCache);
            const cacheAge = timestamp - cachedTimestamp;
            if (cachedUserId === userId && cacheAge < CACHE_DURATION) {
              console.log('✅ loadUserProfile - Using localStorage cached profile (age:', Math.round(cacheAge / 1000), 'seconds)');
              setProfile(cachedProfile);
              setProfileCache({ userId, profile: cachedProfile, timestamp: cachedTimestamp });
              // Charger en arrière-plan pour rafraîchir le cache
              setTimeout(() => loadUserProfile(userId, true), 1000);
              return;
            } else {
              console.log('⏰ loadUserProfile - localStorage cache expired or different user');
            }
          }
        } catch (e) {
          console.warn('⚠️ loadUserProfile - localStorage cache error:', e);
        }
      }

      // Marquer comme en cours de chargement
      setLoadingProfile(userId);

      console.log('🔍 loadUserProfile - Starting for userId:', userId, 'forceRefresh:', forceRefresh, 'timestamp:', timestamp);

      // Lancer les 2 requêtes essentielles en PARALLÈLE
      console.log('🔍 loadUserProfile - Launching queries in parallel...');

      const timeoutDuration = 20000; // Augmenté à 20s pour éviter les timeouts (User Request)

      const [
        { data: userData, error: userError },
        { data: subscriptionData, error: subscriptionError }
      ] = await Promise.all([
        // User profiles - Explicitly selecting needed fields for role detection
        Promise.race([
          supabase
            .from('user_profiles')
            .select('*, partner_id, is_admin')
            .eq('user_id', userId)
            .maybeSingle(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('User profile query timeout')), timeoutDuration)
          )
        ]).catch(err => ({ data: null, error: err })),

        // Subscriptions
        Promise.race([
          supabase
            .from('subscriptions')
            .select('id,user_id,status,stripe_subscription_id,current_period_end')
            .eq('user_id', userId)
            .maybeSingle(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Subscription query timeout')), timeoutDuration)
          )
        ]).catch(err => ({ data: null, error: err }))
      ]) as any;

      console.log('🔍 loadUserProfile - All queries completed');
      console.log('  - User data:', userData, 'error:', userError);
      console.log('  - Subscription data:', subscriptionData, 'error:', subscriptionError);

      if (userError) {
        console.warn('⚠️ User profile query warning:', userError);
        // CRITICAL FIX: Stop if recursion is detected to prevent login loop
        if (typeof userError === 'object' && userError !== null && 'message' in userError) {
          const msg = (userError as any).message || '';
          if (msg.includes('recursion')) {
            console.error('🛑 Recursion error detected. Halting profile load.');
            toast.error('Erreur critique (RLS). Contactez le support.');
            return;
          }
        }
      }
      if (subscriptionError) {
        console.warn('⚠️ Subscription query warning:', subscriptionError);
      }

      // Si aucune donnée n'est trouvée, on définit un profil guest minimal
      if (!userData) {
        console.warn('⚠️ loadUserProfile - No profile data found for user:', userId);
        const guestProfile = {
          user_id: userId,
          role: 'guest' as Role,
          subscription_status: subscriptionData?.status,
        };
        setProfile(guestProfile);
        logger.auth.profileLoad(guestProfile);
        return;
      }

      console.log('🔍 loadUserProfile - Deriving role from data...');
      const role = deriveRole(userData, null, subscriptionData);
      console.log('🔍 loadUserProfile - Role derived:', role, 'subscription status:', subscriptionData?.status);

      const merged = {
        ...(userData ?? {}),
        ...(subscriptionData ? {
          subscription: subscriptionData,
          subscription_status: subscriptionData.status
        } : {}),
        role,
      };

      console.log('✅ loadUserProfile - Final merged profile:', merged);
      setProfile(merged);

      const cacheTimestamp = Date.now();

      // Mettre en cache le profil (mémoire)
      setProfileCache({
        userId,
        profile: merged,
        timestamp: cacheTimestamp
      });

      // Mettre en cache le profil (localStorage)
      try {
        localStorage.setItem('nowme_profile_cache', JSON.stringify({
          userId,
          profile: merged,
          timestamp: cacheTimestamp
        }));
        console.log('💾 loadUserProfile - Profile saved to localStorage');
      } catch (e) {
        console.warn('⚠️ loadUserProfile - Failed to save to localStorage:', e);
      }

      logger.auth.profileLoad(merged);

      // Déverrouiller
      setLoadingProfile(null);
    } catch (e: any) {
      console.error('❌ loadUserProfile error:', e);

      // Déverrouiller en cas d'erreur
      setLoadingProfile(null);

      // Si timeout ou erreur, essayer avec la fonction Edge comme fallback
      if (e.message?.includes('timeout') || e.message?.includes('Query timeout')) {
        console.warn('⚠️ loadUserProfile - Timeout detected, trying Edge Function fallback...');
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-profile`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({ userId })
            }
          );

          if (response.ok) {
            const { userData, partnerData } = await response.json();
            console.log('✅ loadUserProfile - Data from Edge Function:', { userData, partnerData });

            if (!userData && !partnerData) {
              const guestProfile = {
                user_id: userId,
                role: 'guest' as Role,
                subscription_status: undefined,
              };
              setProfile(guestProfile);
              return;
            }

            const role = deriveRole(userData, partnerData, null);
            const merged = {
              ...(userData ?? {}),
              ...(partnerData ? { partner: partnerData } : {}),
              role,
            };

            setProfile(merged);
            logger.auth.profileLoad(merged);
            return;
          }
        } catch (fallbackError) {
          console.error('❌ loadUserProfile - Edge Function fallback failed:', fallbackError);
        }
      }

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

        logger.auth.sessionCheck(session);
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
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          logger.auth.stateChange(event, session);
          setLoading(true);
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
          setLoading(false);
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
        .maybeSingle() as { data: { id: string } | null };

      if (partnerData?.id) {
        navigate('/partner/dashboard');
        return;
      }

      const { data: userData } = await supabase
        .from('user_profiles')
        .select('is_admin,subscription_status')
        .eq('user_id', currentUser.id)
        .maybeSingle() as { data: { is_admin?: boolean; subscription_status?: string } | null };

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
      logger.auth.signOut();
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      logger.navigation.redirect('current', '/', 'User signed out');
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
  const isAuthenticated = !!user; // Connecté = a une session Supabase
  const isAdmin = role === 'admin';
  const isPartner = role === 'partner';
  const isSubscriber = role === 'subscriber' || profile?.subscription_status === 'active';

  // Log uniquement si le rôle change ou en cas de problème
  // console.log('🔍 Auth Context - Profile:', { role, subscription_status: profile?.subscription_status, isSubscriber });

  const refreshProfile = async () => {
    console.log('🔄 refreshProfile - Starting...');
    try {
      // Recharger la session pour s'assurer qu'on a les dernières données
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ refreshProfile - Session error:', sessionError);
        throw sessionError;
      }

      if (session?.user) {
        console.log('🔄 refreshProfile - Reloading profile for user:', session.user.id);
        await loadUserProfile(session.user.id, true); // Force refresh pour éviter le cache
        console.log('✅ refreshProfile - Profile reloaded successfully');
      } else {
        console.warn('⚠️ refreshProfile - No session found');
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ refreshProfile - Error:', error);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    isAuthenticated,
    isAdmin,
    isPartner,
    isSubscriber,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
