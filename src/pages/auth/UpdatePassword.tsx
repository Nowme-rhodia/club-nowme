import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { SEO } from '../../components/SEO';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const tokenParam = params.get('access_token');
    setToken(tokenParam);

    if (!tokenParam) {
      setError('Lien invalide ou expiré. Veuillez demander un nouveau lien.');
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
      setError('Lien invalide. Veuillez redemander un lien.');
      return;
    }

    setLoading(true);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erreur lors de la mise à jour');
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a été mis à jour avec succès' }
        });
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p>Chargement du lien de réinitialisation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <SEO title="Nouveau mot de passe" description="Créez votre nouveau mot de passe" />
      <h2 className="text-2xl font-bold mb-2">Réinitialisation du mot de passe</h2>
      <p className="text-sm mb-6">Créez un nouveau mot de passe sécurisé</p>

      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        {success ? (
          <div className="text-center">
            <div className="rounded-full bg-green-100 p-3 mx-auto w-fit mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Mot de passe mis à jour !
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Redirection vers la page de connexion...
            </p>
            <Link to="/auth/signin" className="btn btn-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Aller à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type="password"
                  className="input w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirmer le mot de passe</label>
              <div className="relative">
                <input
                  type="password"
                  className="input w-full"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
