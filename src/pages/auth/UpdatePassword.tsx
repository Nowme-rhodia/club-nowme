// src/pages/auth/UpdatePassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, Check, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SEO } from '../../components/SEO';
import { translateError } from '../../lib/errorTranslations';
import toast from 'react-hot-toast';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [tokenHash, setTokenHash] = useState('');
  const [type, setType] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSessionUpdate, setIsSessionUpdate] = useState(false); // New flag to track if updating via existing session
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Timeout de sécurité : Si au bout de 8s rien ne s'est passé, on arrête de charger
    const safetyTimeout = setTimeout(() => {
      if (mounted && checking) {
        console.warn('⚠️ Safety timeout reached in UpdatePassword.');
        setChecking(false);
        // Si on n'a toujours rien trouvé, on affiche une erreur générique
        if (!isValidToken && !isSessionUpdate) {
          setError('La vérification prend trop de temps. Le lien semble invalide.');
        }
      }
    }, 8000);

    const checkState = async () => {
      // 1. Check Params
      // Robust hash parsing as recommended
      const url = new URL(window.location.href);
      const query = url.searchParams;
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

      const tokenHashParam = query.get('token_hash') || hashParams.get('token_hash');
      const accessTokenParam = query.get('access_token') || hashParams.get('access_token');
      const rawType = query.get('type') || hashParams.get('type');

      // Strict type validation
      const resolvedType = rawType === 'recovery' ? 'recovery' : (tokenHashParam ? 'recovery' : '');

      console.log('🔍 UpdatePassword Check:', { tokenHashParam: !!tokenHashParam, accessTokenParam: !!accessTokenParam, resolvedType });

      if (tokenHashParam) {
        if (mounted) {
          setTokenHash(tokenHashParam);
          setType(resolvedType);
          setIsValidToken(true);
        }
      } else if (accessTokenParam) {
        // Implicit flow already handled by Supabase client usually, but good to note
        if (mounted) {
          setIsValidToken(true);
        }
      }

      // 2. Check Session (Supabase sometimes auto-logs in via the link)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mounted) {
        console.log('✅ User already authenticated via link/session');
        setIsSessionUpdate(true);
        setUserEmail(user.email || 'Utilisateur inconnu');
        setChecking(false);
        setIsValidToken(true);
        return;
      }

      // 3. Fallback: If we found a token but no session yet, we wait for onAuthStateChange or user interaction
      // If we found NOTHING (no token, no session), we error out immediately
      if (!tokenHashParam && !accessTokenParam && !user) {
        if (mounted) {
          setError('Lien invalide ou manquant.');
          setChecking(false);
        }
      } else {
        // We have a token, we stop checking UI and let the user type their password
        // The actual verification happens on Submit
        if (mounted) setChecking(false);
      }
    };

    checkState();

    // Listen to Supabase State
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth Event:', event);
      if (mounted) {
        const isRecovery = event === 'PASSWORD_RECOVERY';
        const isSignedIn = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';

        // If we get a session AND we have a recovery type in URL, we assume it worked
        const hasRecoveryKey = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');

        if (isRecovery || (isSignedIn && session && (hasRecoveryKey || isSessionUpdate))) {
          console.log('✅ Session recovered via event:', event);
          setIsSessionUpdate(true);
          setIsValidToken(true);
          setChecking(false);
          if (session?.user?.email) setUserEmail(session.user.email);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePassword(password);
    if (validation) {
      setError(validation);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!tokenHash && !isSessionUpdate) {
      setError('Session expirée ou lien manquant. Merci de recommencer.');
      return;
    }

    setLoading(true);

    try {
      // 1. If we have a PKCE token, verify it first ONLY if not already in a session
      if (tokenHash && type === 'recovery' && !isSessionUpdate) {
        console.log('🔐 Verifying OTP token...', { type, hashLength: tokenHash.length });

        // Extract email if available to strengthen verification
        const url = new URL(window.location.href);
        const emailParam = url.searchParams.get('email') || new URLSearchParams(url.hash.replace(/^#/, '')).get('email') || undefined;

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
          email: emailParam
        });

        if (verifyError) {
          console.error('❌ verifyOtp failed:', verifyError);
          throw verifyError;
        }

        // Clean URL immediately after verification to prevent reuse/confusion
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      // 2. Ensure we have a session before updateUser
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Votre session a expiré. Cliquez de nouveau sur le lien reçu par email.');
        setLoading(false);
        return;
      }

      // 3. Update the password
      console.log('💾 Updating password...');
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      });

      if (passwordError) {
        // Handle "Same Password" error gracefully
        if (passwordError.message.includes('different from the old password') ||
          passwordError.message.includes('New password should be different')) {
          console.log('⚠️ User used same password. Treating as success.');
          toast.success('Mot de passe confirmé (identique à l\'ancien) !');
          setSuccess(true);

          // Force sign out to ensure clean state
          try { await supabase.auth.signOut(); } catch (_) { }

          setTimeout(() => {
            navigate('/auth/signin', {
              state: { message: 'Vous pouvez vous connecter 🚀' },
            });
          }, 2000);
          return;
        }
        throw passwordError;
      }

      console.log('✅ Password updated successfully');

      // Force sign out to ensure clean state
      try { await supabase.auth.signOut(); } catch (_) { }

      setSuccess(true);
      toast.success('Mot de passe mis à jour avec succès 🎉');

      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Connectez-vous avec votre nouveau mot de passe' },
        });
      }, 2000);

    } catch (err: any) {
      console.error('❌ UpdatePassword error:', err);
      // Detailed error message handling
      if (err.message?.includes('invalid or has expired')) {
        setError('Ce lien a expiré. Demandez-en un nouveau.');
        setIsValidToken(false);
      } else if (err.message?.includes('different from the old')) {
        // Fallback if not caught above
        setError('Le nouveau mot de passe doit être différent de l\'ancien.');
      } else {
        setError(translateError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F4]">
        <p className="text-sm text-gray-600">Vérification du lien...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO title="Réinitialiser le mot de passe" description="Choisissez un nouveau mot de passe" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src="https://i.imgur.com/or3q8gE.png" alt="Logo Nowme" className="mx-auto h-16 w-auto" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Nouveau mot de passe</h2>
        <p className="mt-2 text-sm text-gray-600">Choisissez un mot de passe sécurisé pour continuer à kiffer 🌈</p>

        {/* Identity Confirmation */}
        {userEmail && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 inline-block text-left w-full">
            <p className="text-xs text-blue-600 uppercase font-semibold tracking-wider mb-1">Compte concerné</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">{userEmail}</span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/auth/signin';
                }}
                className="text-xs text-blue-500 hover:text-blue-700 underline ml-2"
              >
                Ce n'est pas vous ?
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-lg sm:rounded-lg sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-fit mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Mot de passe mis à jour 🎉</h3>
              <p className="text-sm text-gray-500 mb-6">Redirection en cours...</p>
              <Link
                to="/auth/signin"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Link>
            </div>
          ) : !isValidToken ? (
            <div className="text-center">
              <div className="rounded-full bg-red-100 p-3 mx-auto w-fit mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Lien invalide</h3>
              <p className="text-sm text-gray-500 mb-6">{error || "Le lien est invalide ou a expiré."}</p>
              <Link
                to="/auth/forgot-password"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
              >
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Nouveau mot de passe
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 px-3 py-3 pl-10 pr-10 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Ton nouveau mot de passe"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500 mb-2">Votre mot de passe doit contenir :</p>
                  <div className={`flex items-center text-xs ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {password.length >= 8 ? <Check className="w-3 h-3 mr-1.5" /> : <div className="w-3 h-3 mr-1.5 rounded-full border border-gray-300" />}
                    8 caractères minimum
                  </div>
                  <div className={`flex items-center text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {/[A-Z]/.test(password) ? <Check className="w-3 h-3 mr-1.5" /> : <div className="w-3 h-3 mr-1.5 rounded-full border border-gray-300" />}
                    1 majuscule
                  </div>
                  <div className={`flex items-center text-xs ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {/[0-9]/.test(password) ? <Check className="w-3 h-3 mr-1.5" /> : <div className="w-3 h-3 mr-1.5 rounded-full border border-gray-300" />}
                    1 chiffre
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirme le mot de passe
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 px-3 py-3 pl-10 pr-10 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Encore une fois pour être sûre"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center px-4 py-3 rounded-full font-medium text-white shadow-sm ${loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary'
                  }`}
              >
                {loading ? 'Mise à jour en cours...' : 'Réinitialiser le mot de passe'}
              </button>

              <div className="text-center">
                <Link to="/auth/signin" className="text-sm font-medium text-primary hover:text-primary-dark">
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
