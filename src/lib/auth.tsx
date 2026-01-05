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
  is_ambassador?: boolean;
  sub_auto_recap?: boolean;
  selected_plan?: string;
  sub_newsletter?: boolean;
  partner_id?: string;
  role?: Role;
  created_at?: string;
  updated_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  accepted_community_rules_at?: string | null;
  whatsapp_number?: string | null;
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

  // Refs for accessing latest state in closures (callbacks/effects)
  const profileRef = React.useRef<UserProfile | null>(null);
  const profileCacheRef = React.useRef<{ userId: string; profile: UserProfile; timestamp: number } | null>(null);
  const loadingProfileRef = React.useRef<string | null>(null);

  // Update refs when state changes
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    profileCacheRef.current = profileCache;
  }, [profileCache]);

  useEffect(() => {
    loadingProfileRef.current = loadingProfile;
  }, [loadingProfile]);

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

      // Vérifier si un chargement est déjà en cours pour cet utilisateur (via RED)
      if (loadingProfileRef.current === userId && !forceRefresh) {
        console.log('⏸️ loadUserProfile - Already loading profile for userId:', userId);
        return;
      }

      // Vérifier le cache mémoire si pas de forceRefresh (via REF)
      if (!forceRefresh && profileCacheRef.current && profileCacheRef.current.userId === userId) {
        const cacheAge = timestamp - profileCacheRef.current.timestamp;
        if (cacheAge < CACHE_DURATION) {
          console.log('✅ loadUserProfile - Using memory cached profile (age:', Math.round(cacheAge / 1000), 'seconds)');
          setProfile(profileCacheRef.current.profile);
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
      loadingProfileRef.current = userId; // Update ref immediately for race condition protection

      console.log('🔍 loadUserProfile - Starting for userId:', userId, 'forceRefresh:', forceRefresh, 'timestamp:', timestamp);

      // Lancer les 2 requêtes essentielles en PARALLÈLE
      console.log('🔍 loadUserProfile - Launching queries in parallel...');

      const timeoutDuration = 5000; // Réduit à 5s pour un fallback plus rapide vers l'Edge Function

      const [
        { data: userData, error: userError },
        { data: subscriptionData, error: subscriptionError },
        { data: isAdminRpc, error: adminRpcError }
      ] = await Promise.all([
        // User profiles - Explicitly selecting needed fields for role detection
        Promise.race([
          supabase
            .from('user_profiles')
            .select('*, partner_id, is_admin, is_ambassador')
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
        ]).catch(err => ({ data: null, error: err })),

        // Secure RPC Admin Check (Failsafe)
        Promise.race([
          supabase.rpc('am_i_admin'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RPC query timeout')), timeoutDuration)
          )
        ]).then(res => {
          // Promise.race returns the RPC response object { data, error } or throws
          return res;
        }).catch(err => {
          console.warn('⚠️ RPC logic error or timeout:', err);
          return { data: false, error: err };
        })
      ]) as any;

      console.log('🔍 loadUserProfile - All queries completed');
      // console.log('  - User data:', userData, 'error:', userError);
      // console.log('  - Subscription data:', subscriptionData, 'error:', subscriptionError);

      if (userError) {
        // Only warn if it's NOT a timeout (timeouts are handled by fallback below)
        const isTimeout = userError.message?.includes('timeout');
        if (!isTimeout) {
          console.warn('⚠️ User profile query warning:', userError);
        }

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
        // Silently handle subscription timeouts too
        const isTimeout = subscriptionError.message?.includes('timeout');
        if (!isTimeout) {
          console.warn('⚠️ Subscription query warning:', subscriptionError);
        }
      }

      // Si aucune donnée n'est trouvée, on définit un profil guest minimal
      if (!userData) {
        // PROTECTION: Si on a une erreur (timeout, réseau), on ne bascule PAS en guest
        if (userError) {
          // Check if it is a timeout -> if so, throw to trigger catch block and Edge Function fallback
          if (userError.message?.includes('timeout')) {
            throw userError;
          }

          console.error('❌ loadUserProfile - Critical error fetching profile. Aborting guest fallback.', userError);
          throw userError; // On renvoie l'erreur pour ne pas écraser le profil actuel avec un guest
        }

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

      // Merge RPC result
      const finalIsAdmin = userData?.is_admin || isAdminRpc === true;
      const userDataWithRpc = { ...userData, is_admin: finalIsAdmin };

      const role = deriveRole(userDataWithRpc, null, subscriptionData);
      console.log('🔍 loadUserProfile - Role derived:', role, 'rpc_admin:', isAdminRpc);

      const merged = {
        ...(userDataWithRpc ?? {}),
        // CRITICAL FIX: Ensure subscription_status is DRIVEN by the subscriptions table
        // If no subscription data found, status MUST be undefined/null, regardless of what userData says
        subscription: subscriptionData || null,
        subscription_status: subscriptionData?.status || null,
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
      loadingProfileRef.current = null;
    } catch (e: any) {
      // console.error('❌ loadUserProfile error:', e); // Reduced noise

      // Déverrouiller en cas d'erreur
      setLoadingProfile(null);
      loadingProfileRef.current = null;

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

      // PROTECTION: Ne pas écraser le profil avec null en cas d'échec total (garde le cache ou l'état précédent)
      if (!profileRef.current) {  // Check Ref here too
        setProfile(null);
      } else {
        console.warn('⚠️ loadUserProfile - Keeping existing profile despite error');
      }
    }
  };

  // Ref pour distinguer la déconnexion volontaire de l'expiration
  const isSigningOut = React.useRef(false);

  // ---- init + subscriptions ----
  useEffect(() => {
    let mounted = true;

    // CRITICAL FIX: Handle 'type=recovery' manually if Supabase redirects to root
    // Only redirect if we are NOT already on the update password page to avoid loops
    if (window.location.hash &&
      window.location.hash.includes('type=recovery') &&
      !window.location.pathname.includes('update-password')) {
      console.log('🔗 Recovery hash detected, forcing redirect to update-password');
      // Fix: Preserve the hash/search so the token is passed to the page
      navigate({
        pathname: '/auth/update-password',
        hash: window.location.hash,
        search: window.location.search
      });
    }

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
          // Détection d'expiration de session (SIGNED_OUT sans action volontaire)
          if (event === 'SIGNED_OUT' && !isSigningOut.current) {
            // VERIFICATION : Est-on vraiment déconnecté ?
            const { data: { session: verificationSession } } = await supabase.auth.getSession();
            if (verificationSession) {
              console.log('🛡️ Ignored spurious SIGNED_OUT event, session still valid');
              return;
            }

            console.log('⚠️ Session expired or remote sign out detected');
            toast.error('Votre session a expiré. Veuillez vous reconnecter.', {
              duration: 5000,
              icon: '🔒'
            });
            // On peut aussi rediriger vers la page de connexion si on veut être strict
            // navigate('/auth/signin'); 
          }

          // Reset du flag après le traitement de l'événement
          if (event === 'SIGNED_OUT') {
            isSigningOut.current = false;
          }

          logger.auth.stateChange(event, session);
          setLoading(true);
          setUser(session?.user ?? null);

          if (event === 'PASSWORD_RECOVERY') {
            console.log('🔐 PASSWORD_RECOVERY détecté');
            toast.success('Lien validé, tu peux définir ton nouveau mot de passe ✨');
            navigate('/auth/update-password');
          }

          // Special handling for TOKEN_REFRESHED to avoid clearing profile on transient errors
          // Use REF to check if profile exists, to avoid stale closure issue
          if (event === 'TOKEN_REFRESHED' && session?.user && profileRef.current) {
            console.log('🔄 Token refreshed. Keeping existing profile to prevent flicker/logout.');
            setLoading(false);
            return;
          }

          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error('onAuthStateChange error:', e);
          // Only clear profile if we are absolutely sure the session is gone or invalid
          if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
            setProfile(null);
          } else {
            console.warn('⚠️ Keeping previous profile despite error during auth event:', event);
          }
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
      } else {
        navigate('/account');
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
      // Flag pour indiquer que c'est une action volontaire
      isSigningOut.current = true;

      // 1. Immediate state clear to prevent UI from thinking we are still logged in
      setUser(null);
      setProfile(null);
      setLoading(true);

      // Clear caches
      setProfileCache(null);
      setLoadingProfile(null);
      try {
        localStorage.removeItem('nowme_profile_cache');
      } catch (e) {
        console.warn('Error clearing local storage:', e);
      }

      logger.auth.signOut();

      // 2. Perform actual sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      logger.navigation.redirect('current', '/', 'User signed out');
      navigate('/');
    } catch (e: any) {
      // Ignore "Auth session missing" error as it means we are already logged out
      if (e?.message?.includes('Auth session missing') || e?.status === 403) {
        console.warn('⚠️ Server sign out failed but session was already invalid (benign):', e.message);

        // CRITICAL FIX: Force clear Supabase local storage to prevent auto-login resurrection
        try {
          localStorage.removeItem('sb-dqfyuhwrjozoxadkccdj-auth-token');
        } catch (storageErr) {
          console.warn('Could not clear Supabase token:', storageErr);
        }

        navigate('/');
        return;
      }

      console.error('Sign out error:', e);
      // Force navigation even on error
      navigate('/');
      toast.error('Déconnecté locally (prob. résolu)');
    } finally {
      // Always ensure local storage is wiped in any logout scenario to be safe
      try {
        localStorage.removeItem('sb-dqfyuhwrjozoxadkccdj-auth-token');
      } catch (ignore) { }

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
