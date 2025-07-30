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
      { email: 'rhodia@nowme.fr', password: 'azert123', role: 'super_admin' },
      { email: 'nowme.club@gmail.com', password: 'azert123', role: 'subscriber_admin' },
      { email: 'rhodia.kw@gmail.com', password: 'azert123', role: 'partner_admin' }
    ];

    try {
      for (const user of users) {
        console.log(`🔄 Création de ${user.email}...`);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-recreate-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              email: user.email,
              password: user.password,
              role: user.role,
              redirectTo: 'https://club.nowme.fr/auth/update-password'
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Erreur HTTP ${response.status}`);
        }

        console.log(`✅ Utilisateur ${user.email} créé avec rôle ${user.role}`);
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
        <h2 className="text-xl font-bold mb-4">Création des comptes admin</h2>
        
        <div className="mb-6 text-left text-sm space-y-2">
          <div className="p-3 bg-purple-50 rounded">
            <strong>rhodia@nowme.fr</strong> - Super Admin (accès total)
          </div>
          <div className="p-3 bg-blue-50 rounded">
            <strong>nowme.club@gmail.com</strong> - Admin Abonnés
          </div>
          <div className="p-3 bg-green-50 rounded">
            <strong>rhodia.kw@gmail.com</strong> - Admin Partenaires
          </div>
        </div>

        {error ? (
          <p className="text-red-600 mb-6">{error}</p>
        ) : token ? (
          <>
            <p className="text-gray-600 mb-6">Mot de passe pour tous : <code>azert123</code></p>
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
              {status === 'loading' ? 'Création en cours...' : status === 'done' ? '✅ Comptes créés' : 'Créer les 3 comptes admin'}
            </button>
          </>
        ) : (
          <p className="text-gray-500 italic">Chargement en cours...</p>
        )}
      </div>
    </div>
  );
}