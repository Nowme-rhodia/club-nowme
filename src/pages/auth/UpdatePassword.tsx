// src/pages/auth/UpdatePassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SEO } from '../../components/SEO';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [tokenHash, setTokenHash] = useState('');
  const [type, setType] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSessionAndToken = async () => {
      // 1. Check if we're already logged in (Implicit flow handling)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mounted) {
        console.log('✅ UpdatePassword - User already authenticated, allowing update');
        setIsValidToken(true);
        setChecking(false);
        return;
      }

      // 2. Parse URL params for Token
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));

      const tokenFromQuery = query.get('token_hash') || query.get('token') || query.get('access_token');
      const typeFromQuery = query.get('type');
      const code = query.get('code'); // PKCE code

      const tokenFromHash = hash.get('token_hash') || hash.get('token') || hash.get('access_token');
      const typeFromHash = hash.get('type');

      const token = tokenFromQuery || tokenFromHash;
      const tokenType = typeFromQuery || typeFromHash;

      console.log('UpdatePassword - URL params:', {
        search: window.location.search,
        hash: window.location.hash,
        token: !!token,
        type: tokenType,
        code: !!code
      });

      if (code) {
        // If there is a code, we must wait for Supabase to exchange it for a session.
        // We do nothing here and let the onAuthStateChange listener handle it.
        console.log('🔄 UpdatePassword - PKCE code detected, waiting for session exchange...');
        return;
      }

      if (token && tokenType === 'recovery') {
        if (mounted) {
          setTokenHash(token);
          setType(tokenType);
          setIsValidToken(true);
          setChecking(false);
        }
      } else if (token && !tokenType) {
        // Fallback
        if (mounted) {
          setTokenHash(token);
          setType('recovery');
          setIsValidToken(true);
          setChecking(false);
        }
      } else {
        // Only show error if NOT authenticated and NO code pending
        if (mounted) {
          // Double check session one last time before erroring
          setTimeout(async () => {
            if (!mounted) return;
            const { data: { user: retryUser } } = await supabase.auth.getUser();
            if (retryUser) {
              setIsValidToken(true);
              setChecking(false);
            } else {
              setError("Lien invalide ou expiré. Veuillez demander un nouveau lien.");
              setChecking(false);
            }
          }, 2000); // 2s grace period
        }
      }
    };

    checkSessionAndToken();

    // Listen for auth state changes (crucial for PKCE)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('UpdatePassword - Auth State Change:', event);
      if (session?.user && mounted) {
        console.log('✅ UpdatePassword - Session established via listener');
        setIsValidToken(true);
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
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

    if (!tokenHash || !type) {
      setError('Lien manquant. Merci de recommencer.');
      return;
    }

    setLoading(true);

    try {
      // Essayer d'abord avec verifyOtp
      let updateError = null;

      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });

        if (verifyError) throw verifyError;

        // Puis mettre à jour le mot de passe
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password
        });

        if (passwordError) throw passwordError;

      } catch (verifyErr) {
        console.log('verifyOtp failed, trying direct password update:', verifyErr.message);

        // Fallback : essayer directement updateUser avec le token
        const { error: directError } = await supabase.auth.updateUser(
          { password: password },
          { accessToken: tokenHash }
        );

        if (directError) {
          updateError = directError;
        }
      }

      if (updateError) {
        throw new Error(updateError.message || 'Échec de la réinitialisation.');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Mot de passe mis à jour avec succès 🎉' },
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
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
              <p className="text-sm text-gray-500 mb-6">Le lien est invalide ou a expiré.</p>
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
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 px-3 py-3 pl-10 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Ton nouveau mot de passe"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 px-3 py-3 pl-10 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Encore une fois pour être sûre"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
