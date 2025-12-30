// signin.tsx - Version corrigée
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      // Étape 1: Connexion avec email et mot de passe
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error('Erreur de connexion:', signInError);
        throw new Error(signInError.message);
      }

      // Étape 2: Récupérer l'utilisateur immédiatement après la connexion
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
        throw new Error("Impossible de récupérer l'utilisateur connecté");
      }

      if (!user) {
        console.error('Utilisateur non trouvé après connexion');
        throw new Error("Utilisateur non trouvé après connexion");
      }

      console.log('Utilisateur connecté avec succès:', user.id);

      // Étape 3: Vérifier le profil utilisateur (pour admin, partenaire, ou abonné)
      const { data: userDataObtained, error: userDataError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const userData = userDataObtained as any;

      if (userDataError && userDataError.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération du profil utilisateur:', userDataError);
      }

      // Étape 4: Rediriger en fonction du profil
      // Priorité 1: Redirection explicite via 'next' param (email link)
      const nextParam = searchParams.get('next');
      if (nextParam) {
        console.log('Redirection demandée via URL vers:', nextParam);
        navigate(nextParam);
        return;
      }

      // Priorité 2: Redirection demandée via state (router redirect)
      if (location.state?.from) {
        console.log('Redirection demandée via State vers:', location.state.from);
        navigate(location.state.from);
        return;
      }

      if (userData?.partner_id) {
        console.log('Partenaire trouvé (via profil), redirection vers le dashboard partenaire');
        navigate('/partner/dashboard');
        return;
      }

      if (userData?.is_admin) {
        console.log('Utilisateur admin, redirection vers /admin');
        navigate('/admin');
      } else if (userData?.subscription_status === 'active') {
        console.log('Utilisateur avec abonnement actif, redirection vers /dashboard');
        navigate('/dashboard');
      } else {
        console.log('Utilisateur sans abonnement actif, redirection vers /subscription');
        navigate('/subscription');
      }
    } catch (err) {
      console.error('Erreur complète:', err);
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO title="Connexion" description="Connectez-vous à votre compte Nowme" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img src="https://i.imgur.com/or3q8gE.png" alt="Logo" className="mx-auto h-16 w-auto" />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Connexion
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Pas encore membre ?{' '}
          <Link to="/subscription" className="font-medium text-primary hover:text-primary-dark transition-colors">
            Découvrir l'abonnement
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative">
                <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm" />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <div className="mt-1 relative">
                <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm" />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link to="/auth/forgot-password" className="font-medium text-primary hover:text-primary-dark transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading}
                className={`flex w-full justify-center items-center rounded-full border border-transparent px-4 py-3 text-base font-medium text-white shadow-sm
                  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'}`}>
                <LogIn className="w-5 h-5 mr-2" />
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Vous êtes partenaire ?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/partner/signin" className="flex w-full items-center justify-center rounded-full border-2 border-primary px-4 py-3 text-base font-medium text-primary hover:bg-primary/5 transition-colors">
                Accéder à l'espace partenaire
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}