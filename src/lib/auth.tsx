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
  error: Error | null; // Added error state
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
  const [error, setError] = useState<Error | null>(null); // New error state
  const [profileCache, setProfileCache] = useState<{ userId: string; profile: UserProfile; timestamp: number } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);
  const navigate = useNavigate();

  // Refs for accessing latest state in closures
  const profileRef = React.useRef<UserProfile | null>(null);
  const profileCacheRef = React.useRef<{ userId: string; profile: UserProfile; timestamp: number } | null>(null);
  const loadingProfileRef = React.useRef<string | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    profileCacheRef.current = profileCache;
  }, [profileCache]);

  useEffect(() => {
    loadingProfileRef.current = loadingProfile;
  }, [loadingProfile]);

  const CACHE_DURATION = 20 * 60 * 1000;

  const deriveRole = (profileRow: any, partnerRow: any, subscriptionRow: any): Role => {
    const adminish = ['admin', 'super_admin', 'partner_admin'];

    if (profileRow?.is_admin === true || adminish.includes(profileRow?.subscription_type)) {
      return 'admin';
    }
    if (profileRow?.partner_id) {
      return 'partner';
    }
    if (partnerRow?.id) {
      return 'partner';
    }
    if (subscriptionRow?.status === 'active' || subscriptionRow?.status === 'trialing') {
      return 'subscriber';
    }
    return 'guest';
  };

  const isAbortError = (error: any) => {
    return error?.name === 'AbortError' ||
      error?.message?.includes('aborted') ||
      error?.code === 'ABORTED' ||
      (typeof error === 'string' && error.includes('AbortError'));
  };

  const loadUserProfile = async (userId: string, forceRefresh: boolean = false) => {
    try {
      setError(null); // Clear errors on start
      const timestamp = Date.now();

      if (loadingProfileRef.current === userId && !forceRefresh) {
        return;
      }

      // Memory Cache Check
      if (!forceRefresh && profileCacheRef.current && profileCacheRef.current.userId === userId) {
        const cacheAge = timestamp - profileCacheRef.current.timestamp;
        if (cacheAge < CACHE_DURATION) {
          setProfile(profileCacheRef.current.profile);
          return;
        }
      }

      // LocalStorage Cache Check (SWR)
      if (!forceRefresh) {
        try {
          const localCache = localStorage.getItem('nowme_profile_cache');
          if (localCache) {
            const { userId: cachedUserId, profile: cachedProfile, timestamp: cachedTimestamp } = JSON.parse(localCache);
            if (cachedUserId === userId) {
              // Use cached profile immediately
              setProfile(cachedProfile);
              setProfileCache({ userId, profile: cachedProfile, timestamp: cachedTimestamp });

              const cacheAge = timestamp - cachedTimestamp;
              // Revalidate if cache is older than 10s
              if (cacheAge > 10000) {
                // Don't await this, let it run in background
                setTimeout(() => loadUserProfile(userId, true), 100);
              }
              return;
            }
          }
        } catch (e) {
          console.warn('⚠️ loadUserProfile - localStorage cache check failed');
        }
      }

      setLoadingProfile(userId);
      loadingProfileRef.current = userId;

      const timeoutDuration = 15000;

      const [
        { data: userData, error: userError },
        { data: subscriptionData, error: subscriptionError },
        { data: isAdminRpc, error: adminRpcError }
      ] = await Promise.all([
        // 1. User Profile
        Promise.race([
          supabase.from('user_profiles').select('*, partner_id, is_admin, is_ambassador').eq('user_id', userId).maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('User profile query timeout')), timeoutDuration))
        ]).catch(err => ({ data: null, error: err })),

        // 2. Subscriptions
        Promise.race([
          supabase.from('subscriptions').select('id,user_id,status,stripe_subscription_id,current_period_end').eq('user_id', userId).maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Subscription query timeout')), timeoutDuration))
        ]).catch(err => ({ data: null, error: err })),

        // 3. Admin RPC
        Promise.race([
          supabase.rpc('am_i_admin'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('RPC query timeout')), timeoutDuration))
        ]).then(res => res).catch(err => ({ data: false, error: err }))
      ]) as any;

      if (userError) {
        if (isAbortError(userError)) {
          // Silent return for aborts
          return;
        }

        const msg = (userError as any).message || '';
        if (msg.includes('recursion')) {
          console.error('🛑 Recursion error detected.');
          throw new Error('Erreur critique de base de données (recursion).');
        }
        // If it's a timeout, we throw to trigger fallback
        if (msg.includes('timeout')) {
          throw userError;
        }
        console.warn('⚠️ User profile query warning:', userError);
      }

      // If no user data found (and no error), it means the user exists in Auth but not in user_profiles
      if (!userData) {
        if (userError) throw userError; // Shouldn't happen given logic above, but safety check

        console.warn('⚠️ loadUserProfile - No profile data found. Creating guest profile.');
        const guestProfile = {
          user_id: userId,
          role: 'guest' as Role,
          subscription_status: subscriptionData?.status,
        };
        setProfile(guestProfile);
        logger.auth.profileLoad(guestProfile);
        setLoadingProfile(null);
        loadingProfileRef.current = null;
        return;
      }

      // Derive Role
      const finalIsAdmin = userData?.is_admin || isAdminRpc === true;
      const userDataWithRpc = { ...userData, is_admin: finalIsAdmin };
      const role = deriveRole(userDataWithRpc, null, subscriptionData);

      const merged = {
        ...userDataWithRpc,
        subscription: subscriptionData || null,
        subscription_status: subscriptionData?.status || userDataWithRpc?.subscription_status || null,
        role,
      };

      setProfile(merged);

      // Update Caches
      const cacheTimestamp = Date.now();
      setProfileCache({ userId, profile: merged, timestamp: cacheTimestamp });
      try {
        localStorage.setItem('nowme_profile_cache', JSON.stringify({ userId, profile: merged, timestamp: cacheTimestamp }));
      } catch (e) {
        console.warn('Failed to save profile cache', e);
      }

      logger.auth.profileLoad(merged);
    } catch (e: any) {
      if (isAbortError(e)) {
        return; // Silent bypass
      }
      console.error('❌ loadUserProfile error:', e);

      // Edge Function Fallback
      if (e.message?.includes('timeout') || e.message?.includes('Query timeout')) {
        console.warn('⚠️ Trying Edge Function fallback...');
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
            const role = deriveRole(userData, partnerData, null);
            const merged = { ...(userData ?? {}), ...(partnerData ? { partner: partnerData } : {}), role };
            setProfile(merged);
            setError(null); // Clear error if fallback succeeds
            return; // Success
          }
        } catch (fallbackError) {
          console.error('Edge Function fallback failed:', fallbackError);
        }
      }

      // Final Error Handling
      // If we have a previous profile, keep it but warn
      if (profileRef.current) {
        console.warn('⚠️ Keeping existing profile despite error');
        // Don't set error state if we have a stale but usable profile to avoid blocking UI
      } else {
        // Critical failure: No profile loaded and fetch failed.
        // We must set an error state so the UI knows we are in a broken state
        // instead of redirecting infinitely.
        setError(e);
        setProfile(null);
      }
    } finally {
      setLoadingProfile(null);
      loadingProfileRef.current = null;
    }
  };

  // Ref to track if we are intentionally signing out
  const isSigningOut = React.useRef(false);

  useEffect(() => {
    let mounted = true;

    // Handle Password Recovery Hash
    if (window.location.hash && window.location.hash.includes('type=recovery') && !window.location.pathname.includes('update-password')) {
      navigate({ pathname: '/auth/update-password', hash: window.location.hash, search: window.location.search });
    }

    const init = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        // Just set the user locally, let onAuthStateChange handle the profile load
        // to avoid double-fetching (getSession + onAuthStateChange both triggering it)
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Critical: We must call this here to keep the component "busy"
          // Otherwise React StrictMode + fast completion = AbortError
          await loadUserProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (e: any) {
        // Supabase's internal AbortError is a known issue with localStorage lock conflicts
        // It happens when: multiple tabs, rapid navigation, or React StrictMode unmount/remount
        if (isAbortError(e)) {
          // Don't crash the app - just set a safe default state
          setUser(null);
          setProfile(null);
        } else {
          console.error('Auth init error:', e);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (!mounted) return;

          // ... (existing signOut logic)

          if (event === 'SIGNED_OUT') isSigningOut.current = false;

          setLoading(true);
          const newUser = session?.user ?? null;

          // Avoid re-setting user if unchanged to prevent renders
          setUser(prev => prev?.id === newUser?.id ? prev : newUser);

          // ... (password recovery logic)

          if (event === 'TOKEN_REFRESHED') {
            // ...
          }

          if (newUser) {
            // Deduplication: Don't reload if we already have this user's profile loaded
            // and we are not forcing a refresh (event !== 'SIGNED_IN' usually implies updates, 
            // but INITIAL_SESSION helps).
            // Actually, we use the internal dedupe of loadUserProfile, 
            // but to be safer, we can check profile state here too.
            if (profileRef.current?.user_id === newUser.id && event !== 'SIGNED_IN') {
              // Skip if just token refresh or redundant event
              setLoading(false);
              return;
            }
            await loadUserProfile(newUser.id);
          } else {
            setProfile(null);
          }
        } catch (e) {
          // ...
          console.error('onAuthStateChange error:', e);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !currentUser) throw getUserError || new Error("Impossible de récupérer l'utilisateur");

      // Navigation logic is handled in the component calling signIn usually, 
      // but we keep some defaults here or let the component handle it via isAuthenticated change
      // For legacy reasons we keep the fetches here to ensure profile is ready
      await loadUserProfile(currentUser.id, true);

    } catch (error: any) {
      if (isAbortError(error)) {
        return;
      }
      console.error('SignIn error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      isSigningOut.current = true;
      setUser(null);
      setProfile(null);
      setLoading(true);
      setProfileCache(null);

      try { localStorage.removeItem('nowme_profile_cache'); } catch (e) { }

      await supabase.auth.signOut();
      navigate('/');
    } catch (e) {
      console.error('Sign out error:', e);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}/nouveau-mot-de-passe`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user.id, true);
    }
  };

  const role: Role = profile?.role ?? 'guest';
  const isAuthenticated = !!user;
  const isAdmin = role === 'admin';
  const isPartner = role === 'partner';
  const isSubscriber = role === 'subscriber' || profile?.subscription_status === 'active';

  const value = {
    user,
    profile,
    loading,
    error,
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
