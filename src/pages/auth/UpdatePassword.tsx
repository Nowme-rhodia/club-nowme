import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let hash = window.location.hash;
    if (hash.startsWith('#')) hash = hash.slice(1);
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
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Une erreur est survenue');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a bien été modifié.' },
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return <p>Chargement...</p>;
  }

  if (error && !token) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">{error}</p>
        <a href="/auth/forgot-password" className="text-pink-600 underline">
          Demander un nouveau lien
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center p-4">
        <p className="text-green-600">Mot de passe modifié avec succès !</p>
        <p>Redirection en cours...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 mt-10 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">Réinitialisation du mot de passe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border p-2 rounded"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pink-600 text-white py-2 rounded hover:bg-pink-700 transition"
        >
          {loading ? 'En cours...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </div>
  );
};

export default UpdatePassword;
