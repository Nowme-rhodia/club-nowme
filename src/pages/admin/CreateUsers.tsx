import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CreateUsers() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClick = async () => {
    setStatus('loading');
    setErrorMessage('');

    const baseRedirect = 'https://club.nowme.fr/auth/update-password';

    try {
      // ✅ Admin
      await supabase.auth.signUp({
        email: 'rhodia@nowme.fr',
        password: 'AdminTemp2025!',
        options: { emailRedirectTo: baseRedirect }
      });

      // ✅ Abonnée
      await supabase.auth.signUp({
        email: 'rhodia.kw@gmail.com',
        password: 'AbonneeTemp2025!',
        options: { emailRedirectTo: baseRedirect }
      });

      // ✅ Partenaire
      await supabase.auth.signUp({
        email: 'nowme.club@gmail.com',
        password: 'PartnerTemp2025!',
        options: { emailRedirectTo: baseRedirect }
      });

      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Erreur inconnue');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full p-6 border rounded-xl shadow-md text-center">
        <h2 className="text-lg font-bold mb-4">Créer les comptes système</h2>
        <p className="text-sm text-gray-500 mb-6">Clique sur le bouton ci-dessous pour créer les comptes admin, abonnée et partenaire.</p>
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
