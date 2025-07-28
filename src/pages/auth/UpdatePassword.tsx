// UpdatePassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Lock } from 'lucide-react';
import { SEO } from '../../components/SEO';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Corrige les URLs mal formées avec double slash
    if (window.location.pathname.includes('//')) {
      const corrected = window.location.pathname.replace('//', '/');
      window.history.replaceState(null, '', corrected + window.location.hash);
    }

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    setToken(access_token);

    if (!access_token) {
      setError('Lien invalide ou expiré. Veuillez redemander un lien.');
    }

    setVerifying(false);
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

    if (!token) {
      setError('Le lien de réinitialisation est invalide.');
      return;
    }

    setLoading(true);

    try {
      // ✅ CORRECTION : Utiliser directement l'API Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a bien été mis à jour.' }
        });
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  // Alternative si l'approche directe ne marche pas
  const handleSubmitAlternative = async (e: React.FormEvent) => {
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

    if (!token) {
      setError('Le lien de réinitialisation est invalide.');
      return;
    }

    setLoading(true);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Erreur inconnue');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a bien été mis à jour.' }
        });
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SEO title="Nouveau mot de passe" description="Réinitialisez votre mot de passe" />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Définir un nouveau mot de passe</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-fit mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-lg text-gray-700">Mot de passe modifié avec succès</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 p-4 rounded-md text-red-700 flex items-center text-sm">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pl-10 shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirme ton mot de passe</label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pl-10 shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'}`}
                >
                  {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}