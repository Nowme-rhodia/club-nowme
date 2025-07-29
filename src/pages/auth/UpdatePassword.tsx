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
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1); // remove leading #
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const type = params.get('type');

    if (token && type === 'recovery') {
      setTokenHash(token);
      setIsValidToken(true);
    } else {
      setError("Lien invalide ou expiré.");
    }

    setChecking(false);
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

    if (!tokenHash) {
      setError('Le lien est incomplet. Merci de réessayer.');
      return;
    }

    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      });

      if (verifyError) {
        throw new Error('Erreur lors de la vérification du lien. Il a peut-être expiré.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw new Error('Erreur lors de la mise à jour du mot de passe.');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Mot de passe mis à jour avec succès 🎉' }
        });
      }, 2500);
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
              <p className="text-sm text-gray-500 mb-6">
                Le lien de réinitialisation est invalide ou a expiré.
              </p>
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
                className={`w-full flex justify-center items-center px-4 py-3 rounded-full font-medium text-white shadow-sm ${
                  loading
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
