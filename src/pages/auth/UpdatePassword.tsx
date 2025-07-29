import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SEO } from '../../components/SEO';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false); 

  useEffect(() => {
    const setupSession = async () => {
      try {
        // Extraire les tokens du hash URL
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

        if (!accessToken || type !== 'recovery') {
          setError('Lien de réinitialisation invalide ou expiré');
          setVerifying(false);
          return;
        }

        // Établir la session avec les tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Impossible d\'établir la session. Lien expiré ?');
          setVerifying(false);
          return;
        }

        if (data.session) {
          console.log('Session établie avec succès');
          setHasValidSession(true);
        } else {
          setError('Session invalide');
        }

      } catch (err) {
        console.error('Erreur setup session:', err);
        setError('Erreur lors de la configuration de la session');
      } finally {
        setVerifying(false);
      }
    };

    setupSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!hasValidSession) {
      setError('Session invalide. Veuillez redemander un lien de réinitialisation.');
      return;
    }

    setLoading(true);

    try {
      // Vérifier la session actuelle
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Session expirée. Veuillez redemander un lien de réinitialisation.');
      }

      console.log('Mise à jour du mot de passe...');
      
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log('Mot de passe mis à jour avec succès');
      setSuccess(true);
      
      // Redirection après succès
      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a été mis à jour avec succès' }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 text-center">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Vérification du lien de réinitialisation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO 
        title="Réinitialisation du mot de passe"
        description="Créez un nouveau mot de passe pour votre compte Nowme"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img src="https://i.imgur.com/or3q8gE.png" alt="Logo" className="mx-auto h-16 w-auto" />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Nouveau mot de passe
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Créez un nouveau mot de passe sécurisé
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-fit mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Mot de passe mis à jour !
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
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

              {!hasValidSession && !error && (
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Établissement de la session en cours...
                      </p>
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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!hasValidSession}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm disabled:bg-gray-100"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 8 caractères
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmer le mot de passe
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={!hasValidSession}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm disabled:bg-gray-100"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !hasValidSession}
                  className={`
                    flex w-full justify-center items-center rounded-full border border-transparent px-4 py-3 text-base font-medium text-white shadow-sm
                    ${loading || !hasValidSession
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                    }
                  `}
                >
                  {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}