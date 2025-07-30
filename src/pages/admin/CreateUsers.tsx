import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CreateUsers() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!data.session?.access_token) {
          console.log('⛔️ Aucune session trouvée. Peut-être non connecté.');
          setError('Non connecté. Veuillez vous authentifier.');
          return;
        }

        setToken(data.session.access_token);
      } catch (err: any) {
        console.error('❌ Erreur récupération session :', err.message || err);
        setError('Erreur de session Supabase.');
      }
    };

    timeout = setTimeout(() => {
      setError('⏳ Temps de chargement trop long...');
    }, 5000);

    loadSession().finally(() => clearTimeout(timeout));
  }, []);

  const handleClick = async () => {
    if (!token) return setError("Token manquant. Impossible d'envoyer la requête.");

    setStatus('loading');
    const users = [
      { email: 'rhodia@nowme.fr', password: 'AdminTemp2025!' },
      { email: 'rhodia.kw@gmail.com', password: 'AbonneeTemp2025!' },
      { email: 'nowme.club@gmail.com', password: 'PartnerTemp2025!' }
    ];

    try {
      for (const user of users) {
        const response = await fetch(
          'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/admin-recreate-user',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              email: user.email,
              password: user.password,
              redirectTo: 'https://club.nowme.fr/auth/update-password'
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Erreur HTTP ${response.status}`);
        }

        console.log(`✅ Utilisateur ${user.email} recréé`);
      }

      setStatus('done');
    } catch (err: any) {
      console.error('❌ Erreur création utilisateurs :', err.message || err);
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full p-6 border rounded-xl shadow-md text-center">
        <h2 className="text-xl font-bold mb-4">Création des comptes système</h2>

        {error ? (
          <p className="text-red-600 mb-6">{error}</p>
        ) : token ? (
          <>
            <p className="text-gray-600 mb-6">Clique pour créer les comptes admin, abonnée et partenaire.</p>
            <button
              onClick={handleClick}
              disabled={status === 'loading'}
              className={`w-full px-4 py-2 rounded-full font-semibold text-white ${
                status === 'done'
                  ? 'bg-green-500'
                  : status === 'loading'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {status === 'loading' ? 'Création en cours...' : status === 'done' ? '✅ Comptes créés' : 'Créer les comptes'}
            </button>
          </>
        ) : (
          <p className="text-gray-500 italic">Chargement en cours...</p>
        )}
      </div>
    </div>
  );
}
