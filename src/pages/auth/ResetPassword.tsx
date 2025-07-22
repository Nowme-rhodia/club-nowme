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

  useEffect(() => {
    const checkTokens = () => {
      try {
        const params = new URLSearchParams(window.location.hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        console.log('DEBUG tokens:', { accessToken, refreshToken });
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
    console.log('DEBUG submit', { password, confirmPassword });

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
      console.log('DEBUG: calling updatePassword');
      await updatePassword(password);
      setSuccess(true);
      console.log('DEBUG: password updated, success');
    } catch (err: any) {
      console.error('DEBUG: error in updatePassword', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return <div>Vérification du lien...</div>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {!hasTokens ? (
          <div>
            <p>Le lien de réinitialisation est invalide ou a expiré.</p>
            <Link to="/auth/forgot-password">Demander un nouveau lien</Link>
          </div>
        ) : (
          <>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
            />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmer le mot de passe"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
            </button>
          </>
        )}
      </form>
      {success && <div>Mot de passe mis à jour !</div>}
    </div>
  );
}