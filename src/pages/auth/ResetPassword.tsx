import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SEO } from '../../components/SEO';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTokens, setHasTokens] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkTokens = () => {
      try {
        const params = new URLSearchParams(window.location.hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setError('Lien de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien.');
          setHasTokens(false);
        } else {
          setHasTokens(true);
        }
      } catch (err) {
        setError('Une erreur est survenue lors de la vérification du lien.');
        setHasTokens(false);
      } finally {
        setVerifying(false);
      }
    };

    const timer = setTimeout(() => {
      checkTokens();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <img src="https://i.imgur.com/or3q8gE.png" alt="Logo" className="mx-auto h-16 w-auto" />
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Vérification du lien de récupération
          </h2>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Vérification de votre lien de réinitialisation...
              </p>
            </div>
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
          Réinitialisation du mot de passe
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
              <Link
                to="/auth/signin"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Aller à la connexion
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

              {!hasTokens ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-6">
                    Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.
                  </p>
                  <Link
                    to="/auth/forgot-password"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
                  >
                    Demander un nouveau lien
                  </Link>
                </div>
              ) : (
                <>
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
                        className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <p className="mt