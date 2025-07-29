// src/pages/admin/CreateUsers.tsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CreateUsers() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClick = async () => {
    setStatus('loading');
    setErrorMessage('');

    const baseRedirect = 'https://club.nowme.fr/auth/update-password';
    const users = [
      { email: 'rhodia@nowme.fr', password: 'AdminTemp2025!', role: 'Admin' },
      { email: 'rhodia.kw@gmail.com', password: 'AbonneeTemp2025!', role: 'Abonnée' },
      { email: 'nowme.club@gmail.com', password: 'PartnerTemp2025!', role: 'Partenaire' }
    ];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('Vous devez être connecté en tant qu\'administrateur');

      for (const user of users) {
        const response = await fetch('/api/admin-recreate-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
            redirectTo: baseRedirect
          })
        });

        const result = await response.json();
        console.log(`📦 Résultat pour ${user.email}:`, result);

        if (!response.ok) {
          throw new Error(`Erreur pour ${user.role}: ${result.error}`);
        }
      }

      setStatus('done');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err?.message || 'Erreur inconnue');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full p-6 border rounded-xl shadow-md text-center">
        <h2 className="text-lg font-bold mb-4">Créer les comptes système</h2>
        <p className="text-sm text-gray-500 mb-6">
          Clique sur le bouton ci-dessous pour créer les comptes admin, abonnée et partenaire.
        </p>

        <button
          onClick={handleClick}
          disabled={status === 'loading' || status === 'done'}
          className={`w-full px-4 py-2 rounded-full text-white font-semibold ${
            status === 'done'
              ? 'bg-green-500 cursor-default'
              : status === 'loading'
              ? 'bg-gray-400'
              : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {status === 'loading'
            ? 'Création en cours...'
            : status === 'done'
            ? '✅ Comptes créés'
            : 'Créer les comptes'}
        </button>

        {status === 'error' && (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
