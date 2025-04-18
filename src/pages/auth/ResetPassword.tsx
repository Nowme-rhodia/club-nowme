import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, Lock } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Vérifier la session au chargement
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log('🔍 Session initiale :', data, error);
      if (error) {
        setError('Erreur lors de la vérification de la session : ' + error.message);
        return;
      }
      if (data?.session) {
        console.log('✅ Session trouvée, access_token :', data.session.access_token);
        setSessionReady(true);
      } else {
        setError('Aucune session trouvée. Veuillez demander un nouveau lien de réinitialisation.');
      }
    };

    checkSession();

    // Écouter les changements d'état d'authentification
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔁 Auth state changed:', event, session);
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('✅ Événement PASSWORD_RECOVERY détecté, access_token :', session.access_token);
        setSessionReady(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Soumission du formulaire déclenchée');

    setError(null);
    setLoading(true);

    // Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
      console.log('❌ Les mots de passe ne correspondent pas');
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    // Vérifier la longueur du mot de passe
    if (password.length < 6) {
      console.log('❌ Mot de passe trop court');
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      setLoading(false);
      return;
    }

    try {
      // Vérifier à nouveau la session avant de faire l'appel
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        console.log('❌ Aucune session valide trouvée avant updateUser');
        setError('Session invalide. Veuillez demander un nouveau lien de réinitialisation.');
        setLoading(false);
        return;
      }

      console.log('🔄 Appel à supabase.auth.updateUser avec le mot de passe :', password);
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.log('❌ Erreur lors de la mise à jour du mot de passe :', updateError.message);
        setError(updateError.message);
      } else {
        console.log('✅ Mot de passe mis à jour avec succès');
        setSuccess(true);
        setTimeout(() => {
          console.log('⏩ Redirection vers /auth/signin');
          navigate('/auth/signin');
        }, 3000);
      }
    } catch (err) {
      console.log('❌ Erreur inattendue lors de la mise à jour :', err);
      setError('Une erreur inattendue est survenue : ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <SEO
          title="Mot de passe mis à jour"
          description="Votre mot de passe a été mis à jour avec succès"
        />
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Mot de passe mis à jour !
          </h1>
          <p className="text-gray-600 mb-8">
            Vous allez être redirigée vers la page de connexion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO
        title="Réinitialisation du mot de passe"
        description="Réinitialisez votre mot de passe Nowme"
      />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Nouveau mot de passe
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choisissez un nouveau mot de passe sécurisé.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || !sessionReady}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading || !sessionReady}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !sessionReady}
                className={`w-full flex justify-center items-center px-6 py-3 rounded-full text-white font-medium 
                  ${loading || !sessionReady
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-dark'} transition-colors duration-200`}
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}