import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SEO } from '../../components/SEO';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [hasValidTokens, setHasValidTokens] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    const parseTokensFromUrl = () => {
      try {
        let hash = window.location.hash;
        if (hash.startsWith('#')) hash = hash.slice(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          setError("Lien invalide ou expiré. Merci de redemander un lien de réinitialisation.");
          setHasValidTokens(false);
          setVerifying(false);
          return;
        }

        setAccessToken(access_token);
        setHasValidTokens(true);
        setVerifying(false);
      } catch (err) {
        setError("Une erreur est survenue lors de la vérification du lien.");
        setHasValidTokens(false);
        setVerifying(false);
      }
    };

    setTimeout(() => parseTokensFromUrl(), 500);
  }, []);

  const handleSubmit = async (e) => {
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

    setLoading(true);
    let hash = window.location.hash;
    if (hash.startsWith('#')) hash = hash.slice(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token") || accessToken;
    const refresh_token = params.get("refresh_token");

    if (!access_token) {
      setError("Token d'accès manquant.");
      setLoading(false);
      return;
    }

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: access_token, refreshToken: refresh_token, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || 'Erreur inconnue');

      await supabase.auth.setSession({ access_token, refresh_token });
      console.log("✅ Session restaurée après reset");

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a été mis à jour avec succès' }
        });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) return (
    <div className="min-h-screen flex justify-center items-center">Chargement...</div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
      <SEO title="Nouveau mot de passe" description="Définissez un nouveau mot de passe" />
      <div className="bg-white p-6 rounded shadow max-w-md w-full mx-auto">
        {success ? (
          <div className="text-center">
            <Check className="w-8 h-8 text-green-600 mx-auto mb-4" />
            <p className="mb-4">Mot de passe mis à jour avec succès.</p>
            <Link to="/auth/signin" className="text-primary font-bold">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-red-600 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" /> {error}
              </div>
            )}
            {!hasValidTokens ? (
              <p className="text-sm text-gray-600">
                Lien invalide. <Link to="/auth/forgot-password" className="text-primary font-bold">Demander un nouveau lien</Link>
              </p>
            ) : (
              <>
                <div>
                  <label>Nouveau mot de passe</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label>Confirmer le mot de passe</label>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-2 rounded">
                  {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
